const content = `# User guide

## Typing expressions
#### To write lambda expression you simply type in the prompt.

## Typing λ symbol
#### If you want to write \`λ\` symbol inside of the Interactive Box - you simply type \`\\\` and Lambdulus will take care of the rest.

#### If you need to write \`λ\` symbol inside of the Markdown Box - you can use \`&lambda;\` sequence.

## Multiple expressions
#### You can also have many submitted expressions. To submit another expression you need to either click the big \`+\` sign in the empty notebook, or to click on the \`three dots\` menu and pick whether you want to open new box before or after your current Box.

## Single Letter Names (SLI)
#### You can write lambda functions and omit whitespaces such as \`(λabc.cba) 2 1 +\`. To do that you have to check switch \`Single Letter Names\` at the top of the page.
#### You can always override the global SLI setting for the specific Box.

## Evaluation Strategies
#### We have option to select from 3 evaluation strategies. The \`Simplified\` strategy is specific evaluation order which evaluates built-in macros atomicaly. The \`Normal\` and the \`Applicative\` strategies are sort of self describing.

## Macros
#### In case you need to define your own macros, you can do that in the same prompt you use to input lambda expression. Each Macro Definition consists of the name of the macro followed by \`:=\` symbol and the lambda expression. Note that between each macro definition and the following term (either another macro or the lambda expression to evaluate) you must put \`;\` as a delimiter.
#### Also note that each Box has it's own namespace, macros in one Box are not accessible in other Boxes.

## Macro Definition
#### Inside the macro definition you can reference any valid macro which is already defined or will be defined in the future. You can, in fact, reference the same macro you are currently defining inside it's own definition - whether you should do it or not is up to you.

## List All Macros
#### If you want to list all defined macros - built-ins and also your macros - you simply click on the *list resembling* icon at the right top of the Box.

## Remove User Macro
#### To remove user macros - \`because you can not remove built-ins\` - you can click on the *three dots* icon at the top right part of the Box and then click on \`Edit Expression\`. You might also want to rewrite your lambda expression in case it references the macro being removed.

## Redefine User Macro
#### To redefine user macro - \`because you can not redefine built-ins\` - you start by selecting the \`three dots\` menu icon, picking the \`Edit Expression\` option and editing your macro there.

## Report a Bug or Request New Features
#### If you want to report a bug or you need some feature - click on the \`Issues\` button on the left or at the top of the page. Then fill in the issue on the GitHub page of the project. Definitely don't forget to check if the corresponding issue already exist.
`

export default content
