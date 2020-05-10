export default `# User guide

## Typing expressions
#### To write lambda expression you simply type in the prompt.

## Typing λ symbol
#### If you want to write \`λ\` symbol you simple type \`\\\` and Lambdulus will take care of the rest.

## Multiple expressions
#### You can also have many submitted expressions. To submit another expression you need to open new empty \`expression box\` by clicking on the \`λ\` inside the \`+λ +Macro +MD\` panel at the end of the notebook.

## Single Letter Names (SLI)
#### You can write lambda functions and omit whitespaces such as \`(λabc.cba) 2 1 +\`. To do that you have to check switch \`Single Letter Names\` at the top of the page.

## Evaluation Strategies
#### We have option to select from 3 evaluation strategies. The \`Simplified\` strategy is specific evaluation order which evaluates built-in macros atomicaly. The \`Normal\` and the \`Applicative\` strategies are sort of self describing.

## Macros
#### If you want to define your own macro - you can. You must first create empty \`macro box\` by clicking on the \`+Macro\` inside the \`+λ +Macro +MD\` panel at the end of the notebook. Then you write macro name followed by symbol \`:=\` and then valid lambda expression.

## Macro Definition
#### Inside the macro definition you can reference any valid macro which is already defined or will be defined in the future. Yes you can reference macro you are just defining inside it's own definition - whether you should or not is up to you.

## List All Macros
#### If you want to list all defined macros - built-ins and also your macros - you simply click on the \`Macro\` icon at the top or on the left of the page.

## Remove User Macro
#### To remove user macros - \`because you can not remove built-ins\` - first show all macros and then hover your mouse over the macro you want to remove and click the \`trash bin\` icon.

## Redefine User Macro
#### To redefine user macro - \`because you can not redefine built-ins\` - just create new empty \`macro box\` and define the already existing macro again - this time with different macro definition.

## Report a Bug or Request New Features
#### If you want to report a bug or you need some feature - click on the \`Issues\` button on the left or at the top of the page. Then fill in the issue on the GitHub page of the project. Definitely don't forget to check if the corresponding issue already exist.
`