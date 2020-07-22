package frontend

import com.raquo.laminar.api.L._
import com.raquo.laminar.nodes.ReactiveHtmlElement
import org.scalajs.dom.html
import HttpClient._
import org.scalajs.dom
import org.scalajs.dom.{MouseEvent}
import org.scalajs.dom.raw._
import sttp.client._
import io.circe.generic.auto._
import io.circe.parser.decode

import scala.concurrent.ExecutionContext.Implicits.global
import scala.scalajs.js
import scala.scalajs.js.annotation.JSImport
import scala.util.{Random, Success, Try}
import java.lang.Float.parseFloat
import scala.util.{Try,Success,Failure}

final case class AcumenInfo(action: String, file: String)

object App {

  private val css = AppCSS

  //Toogle button communication
  val postBus2: EventBus[String] = new EventBus()

  val returned2: EventStream[String] = postBus2.events.flatMap(
    str =>
      EventStream.fromFuture(
        boilerplate
          .response(asStringAlways)
          .post(HttpClient.path("com").param("str", str.toString))
          .send()
          .map(_.body)
      )
  )

  def change(bool: Boolean): String = {
    if (bool){
      return "on"
    }else{
      return "off"
    }
  }

  def sendBackend(requestPath: String, msg: String): Unit = {
    if (msg == ""){
      boilerplate
        .response(asStringAlways)
        .post(HttpClient.path(requestPath))
        .send()
        .map(_.body)
    }else{
      boilerplate
        .response(asStringAlways)
        .post(HttpClient.path(requestPath).param("msg", msg.toString))
        .send()
        .map(_.body)
    }
  }

  // Handle API rendering
  def apply(): ReactiveHtmlElement[html.Div] = div(
    className := "App",
    div(id := "loader", display := "none",
      div(
        div(
          display:= "flex",
          justifyContent:="center",
          /*height:="100px",*/
          div(cls := "loader-wheel")
        ),
        div(cls := "loader-text")
      )
    ),
    div(cls := "navbar",
      label(
        cls:="switch",
        input(
          typ:="checkbox",
          id:="launchToggle",
        ),
        span(
          cls:="sliderToggle round",
        )
      ),
      div(id := "navbarMenu",
        ul(
          li(cls := "navMenuItem",
            a(cls := "dropbtn","File"),
            div(cls := "dropdown-content",
              button(`type` := "button", id := "newAction","New"),
              button(`type` := "button", id := "openAction","Open"),
              button(`type` := "button", id := "saveAction","Save"),
              button(`type` := "button", id := "saveAsAction","Save as"),
              button(`type` := "button", id := "downloadAction","Download"),
              button(`type` := "button", id := "exportAction","Export Table"),
              button(`type` := "button", id := "recoverAction","Recover")
            )
          ),
          li(cls := "navMenuItem",
            a(cls := "dropbtn","Edit"),
            div(cls := "dropdown-content",
              button(`type` := "button", id := "undoAction","Undo"
              ),
              button(`type` := "button", id := "redoAction","Redo"
              ),
              hr(),
              button(`type` := "button", id := "cutAction","Cut"
              ),
              button(`type` := "button", id := "copyAction","Copy"
              ),
              button(`type` := "button", id := "pasteAction", disabled:=true, "Paste"
              ),
              hr(),
              button(`type` := "button", id := "incIndentAction","Increase Indentation"
              ),
              button(`type` := "button", id := "decIndentAction","Decrease Indentation"
              ),
              hr(),
              button(`type` := "button", id := "selectAllAction","Select All"
              ),
              button(`type` := "button", id := "showFind","Find"
              )
            )
          ),
          li(cls := "navMenuItem",
            a(cls := "dropbtn","View"),
            div(cls := "dropdown-content",
              button(`type` := "button", id := "increaseFontSize","Enlarge Font"
              ),
              button(`type` := "button", id := "reduceFontSize","Reduce Font"
              ),
              button(`type` := "button", id := "resetFontSize","Reset Font"
              ),
              div(cls := "vertical-nav",
                div(
                  display:="flex",
                  span(marginRight:="auto","Font"),
                  span(margin:="auto 10px", color:="white","›")
                ),
                ul(cls := "sub-menu", id := "fontMenu")
              ),
              hr(),
              div(
                cls := "vertical-nav",
                div(
                  display:="flex",
                  span(marginRight:="auto","Theme"),
                  span(margin:="auto 10px", color:="white","›")
                ),
                ul(cls := "sub-menu", id := "themeMenu")
              ),
              label(
                input(`type` := "checkbox", id := "lineNumbers", checked := true
                ),
                span("Line Numbers")
              )
            )
          ),
          li(cls := "navMenuItem",
            a(cls := "dropbtn","Plotting"),
            div(cls := "dropdown-content",
              div(cls := "vertical-nav",
                div(
                  display:="flex",
                  span(marginRight:="auto","Style"),
                  span(margin:="auto 10px", color:="white","›")
                ),
                ul(cls := "sub-menu",
                  li(
                    label(
                    input(`type` := "radio", name := "style", id := "plotLines", selected := false),
                    "Lines"
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "style", id := "plotDots"),
                    "Dots"
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "style"),
                    "Both"
                    )
                  )
                )
              ),
              label(
                input(`type` := "checkbox", id := "simulatorFields"),
                span("Simulator Fields")
              ),
              label(
                input(`type` := "checkbox", id := "childCount"),
                span("Child Count")
              ),
              label(
                input(`type` := "checkbox", id := "rngSeeds"),
                span("RNG Seeds")
              )
            )
          ),
          li(cls := "navMenuItem",
            a(cls := "dropbtn","Model"),
            div(cls := "dropdown-content",
              button(`type` := "button", id := "playMenuButton","Run"
              ),
              button(`type` := "button", id := "pauseMenuButton", display:="none","Pause"
              ),
              button(`type` := "button", id := "stepMenuButton","Step"
              ),
              button(`type` := "button", id := "stopMenuButton", disabled := true,"Stop"
              )
            )
          ),
          li(cls := "navMenuItem",
            a(cls := "dropbtn","Semantics"),
            div(cls := "dropdown-content",
              div(cls := "vertical-nav",
                div(
                  display:="flex",
                  span(marginRight:="auto","Traditionnal"),
                  span(margin:="auto 10px", color:="white","›")
                ),
                ul(cls := "sub-menu", id := "traditionalSemantics")
              ),
              div(cls := "vertical-nav",
                div(
                  display:="flex",
                  span(marginRight:="auto","Enclosure"),
                  span(margin:="auto 10px", color:="white","›")
                ),
                ul(cls := "sub-menu", id := "enclosureSemantics")
              ),
              div(cls := "vertical-nav",
                div(
                  display:="flex",
                  span(marginRight:="auto","Deprecated"),
                  span(margin:="auto 10px", color:="white","›")
                ),
                ul(cls := "sub-menu", id := "deprecatedSemantics")
              ),
              hr(),
              label(
                input(`type` := "checkbox", id := "normalization"),
                span("Normalize (to H.A.)")
              )
            )
          ),
          li(cls := "navMenuItem",
            a(cls := "dropbtn","Devices"),
            div(cls := "dropdown-content",
              button(`type` := "button", id := "startServer","Start Server"
              ),
              button(`type` := "button", id := "stopServer", disabled := true,"Stop Server"
              ),
              button(`type` := "button", id := "resetDevice", disabled := true,"Reset Device"),
              button(`type` := "button", id := "serverLink", disabled := true,"Server Link")
            )
          ),
          li(cls := "navMenuItem",
            a(cls := "dropbtn","Help"),
            div(cls := "dropdown-content",
              button(`type` := "button", disabled := true,"Reference Manual"),
              button(`type` := "button", disabled := true,"About"),
              a(href := "http://www.acumen-language.org/p/report-bug.html", target := "_blank","Bugs"),
              button(`type` := "button", disabled := true,"License")
            )
          )
        )
      ),
      div(id := "acumenTitle", margin:= "auto","Acumen 3.0")
    ),
    div(id := "wrapper",
      div(id := "leftPane",
        div(id := "upperPane",
          div(id := "fileNameLabel",
            span(id := "fileNameLabelText","[Untitled]")
          ),
          div(id := "codePanel",
            div(id := "editor", fontSize:= "12px", fontFamily:="Consolas")
          ),
          div(id := "upperBottomPane",
            div(id := "upperButtons",
              button(id := "playButton", cls := "tooltip fade", name:= "Run Simulation",
                img(
                    src:="./icons/play.png",
                    id := "playButtonImg"
                )
              ),
              button(id := "pauseButton", cls := "tooltip fade", name := "Pause simulation", display:= "none",
                img(
                    src:="./icons/pause.png",
                    id := "pauseButtonImg"
                )
              ),
              button(id := "stepButton", cls := "tooltip fade", name := "Compute one simulation step",
                img(
                    src:="./icons/step.png",
                    id := "stepButtonImg"
                  )
              ),
              button(id := "stopButton", cls := "tooltip fade", name := "Stop simulation (cannot resume)", disabled:=true,
                img(
                    src:="./icons/stop.png",
                    id := "stopButtonImg"
                )
              )
            ),
            div(id := "statusZone",
              span("Progress:"),
              progress(id := "progressBar", value := "0", max := "100")
            )
          )
        ),
        div(id := "lowerPane",
          div(cls := "tabs",
            button(id := "consoleButton", cls := "ctablinks active","Console"
            ),
            button(id := "browserButton", cls := "ctablinks","Browser"
            ),
            button(id := "dragAndDropButton", cls := "ctablinks","Drag&Drop"
            )
          ),
          div(id := "consoleTab", cls := "ctabcontent", height:="345px", overflow:="scroll",
            ul(id := "consoleAreaList")
          ),
          div(id := "browserTab", cls := "ctabcontent", display:="none", height:="345px", overflow:="scroll",
            ul(id := "browserAreaList")
          ),
          div(id := "dropTab", cls := "ctabcontent", display:="none", height:="345px", width:= "calc(100% - 105px)"
            , "Drop your files here !"
          )
        )
      ),
      div(id := "viewsPane",
        div(cls := "views",
          button(id := "plotButton", cls := "vtablinks active","Plot"
          ),
          button(id := "traceButton", cls := "vtablinks","Table"
          ),
          button(id := "threeDButton", cls := "vtablinks","_3D"
          )
        ),
        div(id := "plotTab", cls := "vtabcontent", display:= "none", height:= "870px", overflowY:= "scroll"),
        div(id := "traceTab", cls := "vtabcontent", display:= "none",
          div(height:= "870px",
            overflowY:= "scroll",
            table(id := "traceTable")
          )
        ),
        div(id := "threeDtab", cls := "vtabcontent", display:= "none", height:= "870px", overflowY:= "scroll",
          div(id := "canvasPanel",
            div(textAlign:="center", display:="grid", alignContent:="center", height:="100%", width:="100%",
              span("3D panel not yet implemented"),
            )
          ),
          div(id := "threedControls",
            div(id := "threedViews",
              div(id := "threedViewControls",
                button(
                  img(
                    src:="./icons/defaultView.png"
                  )
                ),
                button(
                  img(
                    src:="./icons/frontView.png"
                  )
                ),
                button(
                  img(
                    src:="./icons/rightView.png"
                  )
                ),
                button(
                  img(
                    src:="./icons/topView.png"
                  )
                )
              ),
              div(display:="flex", width:="calc(100% / 3)",
                div(id := "scenePositions",
                  label("Camera"),
                  label(
                    span("X:"),
                    input(`type` := "text", name := "camX")
                  ),
                  label(
                    span("Y:"),
                    input(`type` := "text", name := "camY")
                  ),
                  label(
                    span("Z:"),
                    input(`type` := "text", name := "camZ")
                  )
                ),
                div(id := "scenePositions",
                  label("Look At"),
                  label(
                    span("X:"),
                    input(`type` := "text", name := "laX")
                  ),
                  label(
                    span("Y:"),
                    input(`type` := "text", name := "laY")
                  ),
                  label(
                    span("Z:"),
                    input(`type` := "text", name := "laZ")
                  )
                )
              ),
              div(id := "sceneOptions",
                div(display:="flex", flexDirection:="column",
                  label(
                    input(`type` := "checkbox", id := "showAxis"),
                    span(id := "threedCheckboxText","Show Axis")
                  ),
                  label(
                    input(`type` := "checkbox", id := "streamAnimation"),
                    span(id := "threedCheckboxText","Stream Animation")
                  ),
                  label(
                    input(`type` := "checkbox", id := "matchWallClock"),
                    span(id := "threedCheckboxText","Match Wall Clock")
                  )
                )
              )
            ),
            div(id := "threedTimeControls",
              div(id := "threedControlButtons",
                button(
                  img(
                    src:="./icons/play.png"
                  )
                ),
                button(
                  img(
                    src:="./icons/stop.png"
                  )
                ),
                button(
                  img(
                    src:="./icons/slower.png"
                  )
                ),
                button(
                  img(
                    src:="./icons/faster.png"
                  )
                )
              ),
              div(cls := "slidecontainer",
                input(`type` := "range", min := "0", max := "100", value := "0", cls := "slider", id := "threedProgress")
              ),
              div(id := "timer3D",
                label(id := "threedTimer","Time:"),
                label("Speed: 1.0x")
              )
            )
          )
        )
      ),
      div(id := "promptPanel", display:="none",
        div(id := "dialog",
          div(cls := "dlg-header",
            span(id := "dlgHeader","Warning!")
          ),
          div(cls := "dlg-body",
            span("You have changed this file since the last time it was saved."),
            span("Please confirm your desired action.")
          ),
          div(cls := "dlg-options",
            button(`type` := "button", id := "saveAndContinue","Save and continue"
            ),
            button(`type` := "button", id := "discardAndContinue","Discard and continue"
            ),
            button(`type` := "button", id := "cancelAndGoBack", "Cancel"
            )
          )
        )
      )
    ),
    script(
      typ:="text/javascript",
      src:="./ace-noconflict/ace.js"
    ),
    script(
      src:="./plotly.min.js"
    ),
    script(
      src:="./ReconnectingEventSource.min.js"
    ),
    script(
      src:="./acumen.js"
    )
  )
}
