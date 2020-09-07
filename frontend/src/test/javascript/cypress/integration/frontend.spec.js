// First, make sure that you launched both frontend and backend
// with 'sbt dev' and 'sbt backend/run' command lines 
// then, open this file in the cypress application: happy testing !
describe('Alive', () => {
    
    it('Visits the website', () => {
        cy.visit('/', {timeout: 120000})

        cy.get('#loader') // this will fail if CSS id is changed
          .should('be.visible')
        
        // the loader should dissapear when Acumen server is launched
        cy.get('#loader', {timeout: 30000}) // launching the server should never take more than 30s
        .should('not.be.visible')
        cy.wait(3000)
        cy.get('#error')
        .should('not.be.visible')
    })

})

describe('Acumen correctly initialized', () => {

    it('Browser correctly loaded', () => {
        cy.get('#browserAreaList').children().should('have.length.greaterThan', 0).then(() => {
            for (let i=1; i<648; i++){
                cy.get('[id ="[ID]' + i + '"]').should('exist')
            }
        })
    })
    it('Editor properly initiated', () => {
        cy.window().then((win) => {
            expect(win.editor.getValue()).to.equal('model Main(simulator) =\ninitially\n')
            expect(win.editor.getTheme()).to.equal('ace/theme/dreamweaver')
            expect(win.editor.session.$modeId).to.equal('ace/mode/acumen')
            expect(win.editor.session.getTabSize()).to.equal(2)
        })
        cy.get('#editor').should('have.css', 'fontSize', '12px')
        cy.get('#editor').should('have.css', 'font-family', '"Lucida Console"')
    })

    //it('Menu bar properly initialized', () => {
        // this should be implemented once all features of the Menu bar are ready.
        // this should just test if buttons are enabled/disabled just after initialisation,
        // its features will be tested above.
    //})
})

describe('Test "Edit" features', () => {

    it('Editor "Undo/Redo" test', () => {
        cy.window().then((win) => {
            // we must force this test because Cypress does not handle 'hover' event well.
            cy.get('#editor').type('a')
            cy.get('#undoAction').click({force:true}).then(() => {
                expect(win.editor.getValue()).to.equal('model Main(simulator) =\ninitially\n')
            })
            cy.get('#redoAction').click({force:true}).then(() => {
                expect(win.editor.getValue()).to.equal('model Main(simulator) =\ninitially\na')                 
            })
            cy.get('#editor').type('{backspace}')
        })
    })

    //it('Editor "Cut/Copy/Paste" working', () => {
        // Cypress is currently working on implementing native events.
        // this will allow testing if document.execCommand()function work.
    //})

    it('Editor "Indentation" test', () => {
        cy.window()
          .then((win) => {
                // we must force this test because Cypress does not handle 'hover' event well.
                cy.get('#incIndentAction').click({force:true}).then(() => {
                    expect(win.editor.getValue()).to.equal('model Main(simulator) =\ninitially\n  ')
                })
                cy.get('#decIndentAction').click({force:true}).then(() => {
                    expect(win.editor.getValue()).to.equal('model Main(simulator) =\ninitially\n')                    
                })
        })
    })

    it('Editor "SelectAll" test', () => {
        cy.window()
          .then((win) => {
                // we must force this test because Cypress does not handle 'hover' event well.
                cy.get('#selectAllAction').click({force:true}).then(() => {
                    expect(win.editor.getSelectedText()).to.equal('model Main(simulator) =\ninitially\n')
                    win.editor.selection.clearSelection(); 
                })
        })
    })

    it('Editor "Find" test', () => {
        cy.window()
          .then((win) => {
                // we must force this test because Cypress does not handle 'hover' event well.
                cy.get('#showFind').click({force:true}).then(() => {
                    expect(win.document.getElementById('showFind').checked).to.equal(true)
                    cy.get('input.ace_search_field').first().focus()
                    cy.get('.ace_search_field').first().type('model').then(() => {
                        cy.get('.ace_searchbtn').contains('All').click().then(() => {
                            expect(win.editor.getSelectedText()).to.equal('model')
                            expect(win.document.getElementById('showFind').checked).to.equal(false)
                        })
                    })
                })
        })
    })


})

describe('Test "View" features', () => {
    it('Editor "Font-size" test', () => {
        cy.get('#increaseFontSize').click({force:true}).then(() => {
            cy.get('#editor').should('have.css', 'fontSize', '14px')
        })
        cy.get('#resetFontSize').click({force:true}).then(() => {
            cy.get('#editor').should('have.css', 'fontSize', '12px')
        })
        cy.get('#reduceFontSize').click({force:true}).then(() => {
            cy.get('#editor').should('have.css', 'fontSize', '10px')
        })
        cy.get('#resetFontSize').click({force:true})
    })

    it('Editor "Font-family" test', () => {
        cy.get('input#Monospaced').click({force:true}).then(() => {
            cy.get('#editor').should('have.css', 'font-family', 'Monospaced')
        })
        cy.get('input#Consolas').click({force:true}).then(() => {
            cy.get('#editor').should('have.css', 'font-family', 'Consolas')
        })
        cy.get('input#CourierNew').click({force:true}).then(() => {
            cy.get('#editor').should('have.css', 'font-family', '"Courier New"')
        })
        cy.get('input#LucidaConsole').click({force:true}).then(() => {
            cy.get('#editor').should('have.css', 'font-family', '"Lucida Console"')
        })
    })

    it('Editor "Theme" test', () => {
        cy.window().then((win) => {
            cy.get('input#dreamweaver').click({force:true}).then(() => {
                expect(win.editor.getTheme()).to.equal('ace/theme/dreamweaver')
            })
            cy.get('input#textmate').click({force:true}).then(() => {
                expect(win.editor.getTheme()).to.equal('ace/theme/textmate')
            })
            cy.get('input#ambiance').click({force:true}).then(() => {
                expect(win.editor.getTheme()).to.equal('ace/theme/ambiance')
            })
            cy.get('input#dracula').click({force:true}).then(() => {
                expect(win.editor.getTheme()).to.equal('ace/theme/dracula')
            })
        })
    })

    it('Editor "Line Number" test', () => {
        cy.window().then((win) => {
            cy.get('.ace_gutter').should('be.visible') // initial state
            cy.get('input#lineNumbers').click({force:true}).then(() => {
                cy.get('.ace_gutter').should('not.be.visible')
            })
            cy.get('input#lineNumbers').click({force:true}).then(() => {
                cy.get('.ace_gutter').should('be.visible')
            })
        })
    })
})