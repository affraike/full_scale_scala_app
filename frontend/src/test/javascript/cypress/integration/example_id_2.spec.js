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

describe('"00_Welcome_to_Acumen.acm" Semantics 2015 Optimized', () => {
    it('Upload code data', () => {
        cy.get('[id ="[ID]2"]').click({force:true})
        cy.wait(2000) // arbitrarily wait for acumen to send code data
        cy.window().then((win) => {
            expect(win.editor.getValue()).to.equal("// Welcome to Acumen!\n//\n// To see the effect of this simulation, first press\n// \"play\" this text.  Then, to see the 3D visulaization\n// click on \"3D\" on the dispaly pane (to the right) \n// and press \"play there\".\n\nmodel Main (simulator) = \ninitially\n x = 1, x' = 0, x''= 0, y = 20, y' = 0, y'' = 0, \n _3D = (),_3DView = ((0,-10,2),(0,0,0))\nalways\n x'' = -9.8, y'' = -9.8,\n if (x<0&& x'<0) then x'+ = -0.5 * x', x+ = -x noelse,\n if (y<0&& y'<0) then y'+ = -0.2 * y', y+ = -y noelse,\n _3D = ((Text center=(-1.9,1+x,x+1) size=1   color=(0,1,3)   \n              rotation=(1.5 - pi/2,0,-0.3)   content=\"Welcome\"),\n        (Text center=(-0.2,1,x)     size=1   color=(1,0.1,0) \n              rotation=(2.0+x - pi/2,0,-0.5) content=\"To\"),\n        (Text center=(-2.1,1-y,y-2) size=2   color=(2,2,0)   \n              rotation=(1.3+y- pi/2,0,0.4)  content=\"Acumen!\"))\n")
        })
    })

    it('Computation', () => {
        cy.get('button#playButton').click({force:true})
        cy.get('button#playButton').should('not.be.visible')
        cy.get('button#pauseButton').should('be.visible')
        cy.get('button#stopButton').should('not.be.disabled')
        cy.get('progress#progressBar', {timeout:10000}).should('have.attr', 'value', 100).then(() => {
            cy.get('button#playButton').should('be.visible')
            cy.get('button#pauseButton').should('not.be.visible')
            cy.get('button#stopButton').should('be.disabled')
        })
    })

    it('Table', () => {
        cy.get('button#traceButton').click()
        // arbitrarily wait for acumen to send code data
        cy.wait(5000).then(() => {
            cy.document().then((doc) => {
                expect(doc.getElementsByTagName('tr').length).to.equal(1645)
                expect(doc.getElementsByTagName('th').length).to.equal(14)
            })
        })
    })
    
    it('2D Plot', () => {
        cy.get('button#traceButton').click()
        // arbitrarily wait for acumen to send code data
        cy.wait(5000).then(() => {
            cy.document().then((doc) => {
                cy.get('.xy').should('exist')
                cy.get('.x2y2').should('exist')
                cy.get('.x3y3').should('exist')
                cy.get('.x4y4').should('exist')
                cy.get('.x5y5').should('exist')
                cy.get('.x6y6').should('exist')
            })
        })
    })
    
    it('3D', () => {
    
    })
})