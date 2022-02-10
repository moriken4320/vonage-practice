module.exports = {
    root: true,
    parserOptions: {
      ecmaVersion: 2020,
      parser: "babel-eslint",
    },
    env: {
      es6: true,
      node: true,
      jquery: true
    },
    parser: "vue-eslint-parser",
    extends: ["airbnb-base", "plugin:vue/recommended", "prettier"],
    plugins: ["jquery", "vue"],
    rules: {
      "prefer-template": "error",
      "operator-linebreak": [2, "after"],
      "import/no-unresolved": [2, { ignore: ["^@components"] }],
      "vue/camelcase": "error",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-closing-bracket-newline": "off",
      "vue/max-attributes-per-line": "off",
      "vue/html-indent": "off",
      "vue/custom-event-name-casing": "error",
      "vue/component-name-in-template-casing": [`error`, `PascalCase`],
      "vue/html-self-closing": [
        "error",
        {
          "html": {
            "void": "always",
            "normal": "always",
            "component": "always"
          },
          "svg": "always",
          "math": "always"
        }
      ],

    },
  };