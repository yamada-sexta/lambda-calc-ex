import { Component, For } from "solid-js";
import { Expression } from "./parser";
import "./LambdaAstComponent.css"; // Assuming you save the CSS below in this file

export interface LambdaAstComponentProps {
    node: Expression;
}

export const LambdaAstComponent: Component<LambdaAstComponentProps> = (props) => {
    // We use a dynamic class list based on the node type for specific styling
    const containerClass = () => `lambda-node lambda-${props.node.type}`;

    const renderContent = () => {
        const node = props.node;
        switch (node.type) {
            case "variable":
                return <span class="variable-name">{node.name}</span>;

            case "abstraction":
                return (
                    <>
                        <span class="symbol lambda-symbol">λ</span>
                        <div class="abstraction-header">
                             {/* We reuse the component for the param, 
                                 but styling will make it look like a declaration */}
                            <LambdaAstComponent node={node.param} />
                        </div>
                        <span class="symbol dot-symbol">.</span>
                        <div class="abstraction-body">
                            <LambdaAstComponent node={node.body} />
                        </div>
                    </>
                );

            case "application":
                return (
                   <>
                        {/* Wrap function in a specific container for styling */}
                        <div class="application-func">
                             <LambdaAstComponent node={node.func} />
                        </div>
                        {/* We can make parens subtler or only appear on hover via CSS if desired,
                            but keeping them explicit for now. */}
                        <span class="symbol paren">(</span>
                        <div class="application-arg">
                            <LambdaAstComponent node={node.argument} />
                        </div>
                        <span class="symbol paren">)</span>
                   </>
                );
            default:
                return <span>UNKNOWN NODE</span>
        }
    }

    return (
        <div class={containerClass()}>
            {renderContent()}
        </div>
    );
};