export interface ParsedExpression {
    tokens: Token[];
    variables: Set<string>;
}

export type TokenType = 
    | 'number'
    | 'variable'
    | 'operator'
    | 'function'
    | 'lparen'
    | 'rparen'
    | 'comma';

export interface Token {
    type: TokenType;
    value: string | number;
}

export function tokenize(expression: string): Token[] {
    const tokens: Token[] = [];
    const chars = expression.trim();
    let i = 0;

    while (i < chars.length) {
        const char = chars[i];

        if (/\s/.test(char)) {
            i++;
            continue;
        }

        if (/\d/.test(char) || (char === '-' && /\d/.test(chars[i + 1]))) {
            let num = '';
            if (char === '-') {
                num = '-';
                i++;
            }
            while (i < chars.length && /[\d.]/.test(chars[i])) {
                num += chars[i];
                i++;
            }
            tokens.push({ type: 'number', value: parseFloat(num) });
            continue;
        }

        if (['+', '-', '*', '/', '^'].includes(char)) {
            tokens.push({ type: 'operator', value: char });
            i++;
            continue;
        }

        if (char === '(') {
            tokens.push({ type: 'lparen', value: '(' });
            i++;
            continue;
        }
        if (char === ')') {
            tokens.push({ type: 'rparen', value: ')' });
            i++;
            continue;
        }

        if (char === ',') {
            tokens.push({ type: 'comma', value: ',' });
            i++;
            continue;
        }

        if (/[a-zA-Z_]/.test(char)) {
            let identifier = '';
            while (i < chars.length && /[a-zA-Z0-9_]/.test(chars[i])) {
                identifier += chars[i];
                i++;
            }

            const lowerIdent = identifier.toLowerCase();
            if (['sqrt', 'abs', 'log', 'log10', 'exp', 'sin', 'cos', 'tan', 'min', 'max'].includes(lowerIdent)) {
                tokens.push({ type: 'function', value: lowerIdent });
            } else {
                tokens.push({ type: 'variable', value: identifier.toLowerCase() });
            }
            continue;
        }

        throw new Error(`Unexpected character at position ${i}: ${char}`);
    }

    return tokens;
}

/**
 * Extrai variáveis de uma expressão tokenizada
 */
export function extractVariables(tokens: Token[]): Set<string> {
    const variables = new Set<string>();
    tokens.forEach(token => {
        if (token.type === 'variable') {
            variables.add(token.value as string);
        }
    });
    return variables;
}

/**
 * Avalia uma expressão matemática com valores fornecidos para as variáveis
 * Usa o algoritmo Shunting Yard para converter para notação polonesa reversa (RPN)
 * e então avalia a expressão
 */
export function evaluateExpression(
    expression: string,
    variables: Record<string, number>
): number {
    const tokens = tokenize(expression);
    const rpn = toReversePolishNotation(tokens);
    return evaluateRPN(rpn, variables);
}

/**
 * Converte tokens para notação polonesa reversa (RPN) usando algoritmo Shunting Yard
 */
function toReversePolishNotation(tokens: Token[]): Token[] {
    const output: Token[] = [];
    const operatorStack: Token[] = [];

    const precedence: Record<string, number> = {
        '+': 1,
        '-': 1,
        '*': 2,
        '/': 2,
        '^': 3,
    };

    const rightAssociative = new Set(['^']);

    for (const token of tokens) {
        if (token.type === 'number' || token.type === 'variable') {
            output.push(token);
        } else if (token.type === 'function') {
            operatorStack.push(token);
        } else if (token.type === 'comma') {
            // Pop até encontrar parêntese esquerdo (para funções com múltiplos args)
            while (
                operatorStack.length > 0 &&
                operatorStack[operatorStack.length - 1].type !== 'lparen'
            ) {
                output.push(operatorStack.pop()!);
            }
        } else if (token.type === 'operator') {
            const op = token.value as string;
            while (
                operatorStack.length > 0 &&
                operatorStack[operatorStack.length - 1].type === 'operator'
            ) {
                const topOp = operatorStack[operatorStack.length - 1].value as string;
                if (
                    (precedence[topOp] > precedence[op]) ||
                    (precedence[topOp] === precedence[op] && !rightAssociative.has(op))
                ) {
                    output.push(operatorStack.pop()!);
                } else {
                    break;
                }
            }
            operatorStack.push(token);
        } else if (token.type === 'lparen') {
            operatorStack.push(token);
        } else if (token.type === 'rparen') {
            while (
                operatorStack.length > 0 &&
                operatorStack[operatorStack.length - 1].type !== 'lparen'
            ) {
                output.push(operatorStack.pop()!);
            }
            if (operatorStack.length === 0) {
                throw new Error('Mismatched parentheses');
            }
            operatorStack.pop(); // Remove '('

            // Se houver função no topo da pilha, adicionar à saída
            if (
                operatorStack.length > 0 &&
                operatorStack[operatorStack.length - 1].type === 'function'
            ) {
                output.push(operatorStack.pop()!);
            }
        }
    }

    while (operatorStack.length > 0) {
        const token = operatorStack.pop()!;
        if (token.type === 'lparen' || token.type === 'rparen') {
            throw new Error('Mismatched parentheses');
        }
        output.push(token);
    }

    return output;
}

/**
 * Avalia uma expressão em notação polonesa reversa (RPN)
 */
function evaluateRPN(tokens: Token[], variables: Record<string, number>): number {
    const stack: number[] = [];

    for (const token of tokens) {
        if (token.type === 'number') {
            stack.push(token.value as number);
        } else if (token.type === 'variable') {
            const varName = token.value as string;
            if (!(varName in variables)) {
                throw new Error(`Undefined variable: ${varName}`);
            }
            stack.push(variables[varName]);
        } else if (token.type === 'operator') {
            if (stack.length < 2) {
                throw new Error('Invalid expression: not enough operands');
            }
            const b = stack.pop()!;
            const a = stack.pop()!;
            const op = token.value as string;

            let result: number;
            switch (op) {
                case '+':
                    result = a + b;
                    break;
                case '-':
                    result = a - b;
                    break;
                case '*':
                    result = a * b;
                    break;
                case '/':
                    if (b === 0) {
                        result = 0; // Evitar divisão por zero
                    } else {
                        result = a / b;
                    }
                    break;
                case '^':
                    result = Math.pow(a, b);
                    break;
                default:
                    throw new Error(`Unknown operator: ${op}`);
            }
            stack.push(result);
        } else if (token.type === 'function') {
            const funcName = token.value as string;
            
            // Funções com 1 argumento
            if (['sqrt', 'abs', 'log', 'log10', 'exp', 'sin', 'cos', 'tan'].includes(funcName)) {
                if (stack.length < 1) {
                    throw new Error(`Function ${funcName} requires 1 argument`);
                }
                const arg = stack.pop()!;
                let result: number;

                switch (funcName) {
                    case 'sqrt':
                        result = Math.sqrt(arg);
                        break;
                    case 'abs':
                        result = Math.abs(arg);
                        break;
                    case 'log':
                        result = Math.log(arg);
                        break;
                    case 'log10':
                        result = Math.log10(arg);
                        break;
                    case 'exp':
                        result = Math.exp(arg);
                        break;
                    case 'sin':
                        result = Math.sin(arg);
                        break;
                    case 'cos':
                        result = Math.cos(arg);
                        break;
                    case 'tan':
                        result = Math.tan(arg);
                        break;
                    default:
                        throw new Error(`Unknown function: ${funcName}`);
                }
                stack.push(result);
            }
            // Funções com 2 argumentos
            else if (['min', 'max'].includes(funcName)) {
                if (stack.length < 2) {
                    throw new Error(`Function ${funcName} requires 2 arguments`);
                }
                const b = stack.pop()!;
                const a = stack.pop()!;
                const result = funcName === 'min' ? Math.min(a, b) : Math.max(a, b);
                stack.push(result);
            }
        }
    }

    if (stack.length !== 1) {
        throw new Error('Invalid expression: result stack should have exactly 1 value');
    }

    return stack[0];
}

/**
 * Valida se uma expressão é válida sintaticamente
 */
export function validateExpression(expression: string): { valid: boolean; error?: string } {
    try {
        const tokens = tokenize(expression);
        toReversePolishNotation(tokens);
        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: (error as Error).message,
        };
    }
}
