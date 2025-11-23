

// Token types
export type Token = { type: 'lambda' | 'dot' | 'paren-open' | 'paren-close' } |
{ type: "variable", name: string };
export type TokenType = Token["type"];

// Tokenizer function
export function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < input.length) {
        const char = input[i];

        if (/\s/.test(char)) {
            // Ignore whitespace
            i++;
        } else if (char === 'λ' || char === "\\" || char === "%") {
            tokens.push({ type: 'lambda' });
            i++;
        } else if (char === '.') {
            tokens.push({ type: 'dot' });
            i++;
        } else if (char === '(') {
            tokens.push({ type: 'paren-open' });
            i++;
        } else if (char === ')') {
            tokens.push({ type: 'paren-close' });
            i++;
        } else if (/[a-zA-Z_][a-zA-Z0-9_]*/.test(char)) {
            // Match variables (alphanumeric strings)
            let variable = '';
            while (i < input.length && /[a-zA-Z_][a-zA-Z0-9_]*/.test(input[i])) {
                variable += input[i];
                i++;
            }
            tokens.push({ type: 'variable', name: variable });
        } else {
            throw new Error(`Unexpected character: ${char}`);
        }
    }
    return tokens;
}

export function normalizeTokens(tokens: Token[]): Token[] {
    tokens = [...tokens];  // Copy tokens to avoid mutating the original array


    let mode: "param" | "body" = "body";  // Start in the right mode (function body)
    let parenCount = 0;  // Track the number of open parentheses

    let hasDot = false;
    for (const token of tokens) {
        if (token.type === "dot") {
            hasDot = true;
            console.log("Found dot");
            break;
        }
    }

    let paramLevel = 0;

    for (let i = 0; i < tokens.length; i++) {
        let curr = tokens[i];
        let next = tokens[i + 1];

        if (curr.type === "lambda") {
            mode = "param";  // Switch to left mode (lambda parameters)
            continue;
        }

        if (curr.type === "dot") {
            mode = "body";  // Switch back to right mode (lambda body)
            continue;
        }

        if (mode === "param") {
            if (!hasDot) {
                throw new Error("Expect body");
            }
            // Ensure that variables in the left mode are followed by a dot if another variable appears
            if (curr.type === "variable" && next && next.type === "variable") {
                tokens.splice(i + 1, 0, { type: "dot" });
                i++;  // Skip to the next token after insertion
                tokens.splice(i + 1, 0, { type: "lambda" });
                i++;
            }
        } else if (mode === "body") {
            // Ensure that variables in the right mode (function application) are properly parenthesized case 
            // a b => a (b)
            if (curr.type === "variable" && next && next.type === "variable"
            ) {
                // Insert open parenthesis before the next variable (function application)
                tokens.splice(i + 1, 0, { type: "paren-open" });
                parenCount++;
                i++;  // Skip to the next token after insertion
            }
            if (curr.type === "paren-close" && next && next.type === "variable") {
                // Insert open parenthesis before the next variable (function application)
                tokens.splice(i + 1, 0, { type: "paren-open" });
                parenCount++;
                i++;  // Skip to the next token after insertion
            }

            // if (curr.type === "")

            // If there are parentheses to close, insert paren-close at the correct spot
            if (parenCount > 0 ) {
                i++;  // Skip to the next token after insertion
                tokens.splice(i + 1, 0, { type: "paren-close" });
                parenCount--;
                
            };
        }
    }

    // In case there are still unclosed parentheses, close them at the end
    while (parenCount > 0) {
        tokens.push({ type: "paren-close" });
        parenCount--;
    }

    return tokens;
}


export function tokensToString(tokens: Token[]) {
    let res = "";
    for (let i = 0; i < tokens.length; i++) {
        res += " ";
        const curr = tokens[i];
        switch (curr.type) {
            case "lambda": res += "λ"; break;
            case "dot": res += "."; break;
            case "paren-open": res += "("; break;
            case "paren-close": res += ")"; break;
            case "variable": res += (curr as { name: string }).name; break;
        }
    }
    return res;
}


// AST Node types
export type Variable = {
    type: 'variable';
    name: string;
};

export type Abstraction = {
    type: 'abstraction';
    param: Variable;
    body: Expression;
};

export type Application = {
    type: 'application';
    func: Expression;
    argument: Expression;
};
// Expression can be any of these three types
export type Expression = Variable | Abstraction | Application;

export function parseAST(tokens: Token[]): Expression {
    let currIndex = 0;

    // Helper to peek at current token
    const peek = () => tokens[currIndex];
    const isAtEnd = () => currIndex >= tokens.length;

    // Helper to consume a token if it matches the type
    function match(type: TokenType): boolean {
        if (isAtEnd()) return false;
        if (peek().type === type) {
            currIndex++;
            return true;
        }
        return false;
    }

    // Helper to consume a specific token or throw
    function consume(type: TokenType, message: string): Token {
        if (isAtEnd() || peek().type !== type) {
            throw new Error(message + ` Found: ${isAtEnd() ? "EOF" : peek().type}`);
        }
        return tokens[currIndex++];
    }

    // 1. Parse Expression: The entry point
    // Rules:
    // Expr -> Abstraction | Application
    function parseExpression(): Expression {
        // If we see a Lambda, it's definitely an abstraction
        if (peek()?.type === 'lambda') {
            return parseAbstraction();
        }
        // Otherwise, it's an application chain (or a single atom)
        return parseApplication();
    }

    // 2. Parse Abstraction (Handles λx y. body sugar)
    function parseAbstraction(): Abstraction {
        consume('lambda', "Expected 'λ'");
        
        // We need at least one parameter
        const params: Variable[] = [];
        
        // Keep consuming variables until we hit the dot
        // This handles "λx y z." syntax
        while (!isAtEnd() && peek().type === 'variable') {
            const token = consume('variable', "Expected variable");
            params.push({ type: 'variable', name: (token as any).name });
        }

        if (params.length === 0) {
            throw new Error("Expected at least one parameter after 'λ'");
        }

        consume('dot', "Expected '.' after lambda parameters");

        // The body extends as far to the right as possible
        const body = parseExpression(); 

        // Desugar: Convert [x, y, z] body into λx. λy. λz. body
        // We reduce from right to left
        return params.reduceRight((acc, param) => {
            return { type: 'abstraction', param, body: acc };
        }, body) as Abstraction;
    }

    // 3. Parse Application
    // This handles left-associativity: "x y z" -> "((x y) z)"
    function parseApplication(): Expression {
        let expr = parseAtom(); // Get the first item (e.g., "x")

        while (!isAtEnd()) {
            const next = peek();
            
            // What can start an argument?
            // A variable: "f x"
            // A parenthesis: "f (x)"
            // A lambda (sometimes allowed in loose grammar): "f λx.x"
            if (next.type === 'variable' || next.type === 'paren-open' || next.type === 'lambda') {
                const arg = parseAtom();
                expr = { type: 'application', func: expr, argument: arg };
            } else {
                // If we see a ')' or '.', we stop application parsing
                break;
            }
        }

        return expr;
    }

    // 4. Parse Atom
    // The smallest units: variables, parenthesized expressions, or nested lambdas
    function parseAtom(): Expression {
        if (match('paren-open')) {
            const expr = parseExpression();
            consume('paren-close', "Expected ')'");
            return expr;
        } else if (peek()?.type === 'lambda') {
            return parseAbstraction();
        } else if (peek()?.type === 'variable') {
            const token = consume('variable', "Expected variable");
            return { type: 'variable', name: (token as any).name };
        }
        
        throw new Error(`Unexpected token: ${JSON.stringify(peek())}`);
    }

    // Start parsing
    const result = parseExpression();
    
    // CRITICAL FIX: Ensure we consumed the whole string
    if (!isAtEnd()) {
        throw new Error(`Unexpected token at end of input: ${JSON.stringify(peek())}`);
    }
    
    return result;
}

export function parse(src: string) {
    return parseAST(tokenize(src));
}