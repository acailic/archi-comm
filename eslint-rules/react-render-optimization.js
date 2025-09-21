/**
 * ESLint rules for React rendering optimization
 * Automatically detects and prevents common re-rendering anti-patterns
 */

// Rule: Prevent inline object creation in JSX
const noInlineObjects = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent inline object creation in JSX props to avoid unnecessary re-renders',
      category: 'Performance',
      recommended: false,
    },
    fixable: 'code',
    schema: [],
    messages: {
      inlineObject: 'Avoid inline object creation in JSX. Use useMemo or extract to a variable.',
      inlineArray: 'Avoid inline array creation in JSX. Use useMemo or extract to a variable.',
      inlineFunction: 'Avoid inline function creation in JSX. Use useCallback or extract to a variable.',
    },
  },
  create(context) {
    return {
      JSXExpressionContainer(node) {
        if (node.expression.type === 'ObjectExpression') {
          context.report({
            node,
            messageId: 'inlineObject',
            fix(fixer) {
              return fixer.replaceText(
                node,
                `{useMemo(() => (${context.getSourceCode().getText(node.expression)}), [])}`
              );
            },
          });
        }

        if (node.expression.type === 'ArrayExpression') {
          context.report({
            node,
            messageId: 'inlineArray',
            fix(fixer) {
              return fixer.replaceText(
                node,
                `{useMemo(() => ${context.getSourceCode().getText(node.expression)}, [])}`
              );
            },
          });
        }

        if (
          node.expression.type === 'ArrowFunctionExpression' ||
          node.expression.type === 'FunctionExpression'
        ) {
          context.report({
            node,
            messageId: 'inlineFunction',
            fix(fixer) {
              return fixer.replaceText(
                node,
                `{useCallback(${context.getSourceCode().getText(node.expression)}, [])}`
              );
            },
          });
        }
      },
    };
  },
};

// Rule: Require React.memo for components with many props
const requireMemo = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require React.memo for components with multiple props',
      category: 'Performance',
      recommended: false,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          propThreshold: { type: 'number', minimum: 1 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      requireMemo: 'Component with {{propCount}} props should be wrapped with React.memo for better performance.',
    },
  },
  create(context) {
    const options = context.options[0] || {};
    const { propThreshold = 3 } = options;

    function checkComponent(node, componentName) {
      if (!node.params || node.params.length === 0) return;

      const propsParam = node.params[0];
      let propCount = 0;

      if (propsParam.type === 'ObjectPattern') {
        propCount = propsParam.properties.length;
      } else if (propsParam.type === 'Identifier') {
        // Assume it's a props object
        propCount = 5; // Conservative estimate
      }

      if (propCount >= propThreshold) {
        // Check if already memoized
        const parent = node.parent;
        const isAlreadyMemoized =
          parent?.type === 'CallExpression' &&
          parent.callee?.type === 'MemberExpression' &&
          parent.callee.object?.name === 'React' &&
          parent.callee.property?.name === 'memo';

        if (!isAlreadyMemoized) {
          context.report({
            node,
            messageId: 'requireMemo',
            data: { propCount },
          });
        }
      }
    }

    return {
      FunctionDeclaration(node) {
        if (node.id && /^[A-Z]/.test(node.id.name)) {
          checkComponent(node, node.id.name);
        }
      },
      VariableDeclarator(node) {
        if (
          node.id?.type === 'Identifier' &&
          /^[A-Z]/.test(node.id.name) &&
          (node.init?.type === 'FunctionExpression' || node.init?.type === 'ArrowFunctionExpression')
        ) {
          checkComponent(node.init, node.id.name);
        }
      },
    };
  },
};

// Rule: Warn about expensive operations in render
const noExpensiveRender = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent expensive operations in render without memoization',
      category: 'Performance',
      recommended: false,
    },
    schema: [],
    messages: {
      expensiveOperation: 'Expensive operation "{{operation}}" should be wrapped in useMemo to avoid re-computation on every render.',
    },
  },
  create(context) {
    const expensiveOperations = [
      'sort',
      'filter',
      'map',
      'reduce',
      'find',
      'forEach',
    ];

    function isInRenderContext(node) {
      let current = node.parent;
      while (current) {
        if (
          current.type === 'FunctionDeclaration' ||
          current.type === 'FunctionExpression' ||
          current.type === 'ArrowFunctionExpression'
        ) {
          // Check if it's a React component
          const funcName = current.id?.name || current.parent?.id?.name;
          if (funcName && /^[A-Z]/.test(funcName)) {
            return true;
          }
        }
        current = current.parent;
      }
      return false;
    }

    function isWrappedInMemo(node) {
      let current = node.parent;
      while (current && current.type !== 'CallExpression') {
        current = current.parent;
      }

      if (current?.type === 'CallExpression') {
        return current.callee?.name === 'useMemo' || current.callee?.name === 'useCallback';
      }
      return false;
    }

    return {
      CallExpression(node) {
        if (
          node.callee?.type === 'MemberExpression' &&
          node.callee.property?.type === 'Identifier'
        ) {
          const methodName = node.callee.property.name;

          if (
            expensiveOperations.includes(methodName) &&
            isInRenderContext(node) &&
            !isWrappedInMemo(node)
          ) {
            context.report({
              node,
              messageId: 'expensiveOperation',
              data: { operation: methodName },
            });
          }
        }
      },
    };
  },
};

const plugin = {
  rules: {
    'no-inline-objects': noInlineObjects,
    'require-memo': requireMemo,
    'no-expensive-render': noExpensiveRender,
  },
  configs: {
    recommended: {
      plugins: ['react-render-optimization'],
      rules: {
        'react-render-optimization/no-inline-objects': 'error',
        'react-render-optimization/require-memo': ['warn', { propThreshold: 3 }],
        'react-render-optimization/no-expensive-render': 'error',
      },
    },
  },
};

export default plugin;