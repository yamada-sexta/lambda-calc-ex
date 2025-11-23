import { Accessor, Component } from "solid-js"
import { parseAST, tokenize, tokensToString, Token } from "./parser";
import { monad } from "./monad";
import { LambdaAstComponent } from "./lambda-ast-component";

export interface LambdaTreeProps {
    lambda: Accessor<string>
}

export const LambdaTree: Component<LambdaTreeProps> = (props) => {
    // 1. Tokenize
    const tokensResult = () => monad(tokenize, [props.lambda()]);

    // 2. Parse (Directly from raw tokens)
    const astResult = () => {
        const [ts, tokenErr] = tokensResult();
        
        // If tokenization failed, return that error
        if (tokenErr || !ts) return tokenErr;

        // Otherwise parse
        const [ast, parseErr] = monad(parseAST, [ts]);
        
        if (parseErr) return parseErr;
        return ast;
    }

    // Helper to render the visual tree or error message
    const astComponent = () => {
        const result = astResult();
        if (result instanceof Error) {
            return <div style={{ color: "red", padding: "10px", border: "1px solid red" }}>
                Parse Error: {result.message}
            </div>
        }
        // If result is null/undefined (empty input), render nothing
        if (!result) return null;

        return <LambdaAstComponent node={result} />
    }

    // Helper to show JSON AST debug info
    const astText = () => {
        const result = astResult();
        if (result instanceof Error) return null; // Error handled in astComponent
        
        return (
            <details>
                <summary>AST JSON</summary>
                <pre style={{ "background": "#f0f0f0", "padding": "10px" }}>
                    {JSON.stringify(result, null, 2)}
                </pre>
            </details>
        );
    }

    return (
        <div>
            <h3>Visualizer</h3>
            {astComponent()}
            
            <hr />
            
            <h3>Debug Info</h3>
            
            {/* Tokenizer Output */}
            <div>
                <strong>Raw String:</strong> {props.lambda()}
            </div>

            <div>
                {(() => {
                    const [ts, err] = tokensResult();
                    if (err) return <span style={{color: "red"}}>Token Error: {err.message}</span>;
                    
                    // Reconstruct string from tokens to verify tokenizer integrity
                    return (
                        <>
                            <p><strong>Tokens:</strong> {JSON.stringify(ts)}</p>
                            <p><strong>Reconstructed:</strong> {ts ? tokensToString(ts) : ""}</p>
                        </>
                    )
                })()}
            </div>

            {/* AST JSON Output */}
            {astText()}
        </div>
    )
}