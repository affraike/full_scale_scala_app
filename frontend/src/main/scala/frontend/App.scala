package frontend

import com.raquo.laminar.api.L._
import com.raquo.laminar.nodes.ReactiveHtmlElement
import org.scalajs.dom.html
import HttpClient._
import org.scalajs.dom
import sttp.client._
import io.circe.generic.auto._
import io.circe.parser.decode

import scala.concurrent.ExecutionContext.Implicits.global
import scala.scalajs.js
import scala.util.{Random, Success, Try}

object App {

  private val css = AppCSS
  dom.console.log(css.asInstanceOf[js.Object])

  val postBus: EventBus[Int] = new EventBus()
  val postBus2: EventBus[String] = new EventBus()

  val numberToPost: Var[Int] = Var(0)

  val returned: EventStream[String] = postBus.events.flatMap(
    nbr =>
      EventStream.fromFuture(
        boilerplate
          .response(asStringAlways)
          .post(path("hello").param("nbr", nbr.toString))
          .send()
          .map(_.body)
      )
  )

  val returned2: EventStream[String] = postBus2.events.flatMap(
    str =>
      EventStream.fromFuture(
        boilerplate
          .response(asStringAlways)
          .post(path("acumen").param("str", str.toString))
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

  def apply(): ReactiveHtmlElement[html.Div] = div(
    className := "App",
    h1("Frontend works!"),
    section(
      h2("Backend works?"),
      p(child <-- EventStream.fromFuture(boilerplate.response(asStringAlways).get(path("hello")).send().map(_.body)))
    ),
    section(
      h2("Post to backend to find out!"),
      input(
        value <-- numberToPost.signal.map(_.toString),
        inContext(
          thisElem =>
            onInput.mapTo(Try(thisElem.ref.value.toInt)).collect { case Success(nbr) => nbr } --> numberToPost.writer
        )
      ),
      button("Click me to check!", onClick.mapTo(numberToPost.now) --> postBus.writer),
      br(),
      span("Returned: ", child <-- returned.map(identity[String]))
    ),
    section(
      h2("Communication Backend ↔ Acumen works ?"),
      label(
        cls:="switch",
        input(
          typ:="checkbox",
          id:="launchToggle",
          inContext(
          thisElem =>
            onClick.mapTo(change(thisElem.ref.checked)) --> postBus2.writer
          )
        ),
        span(
          cls:="sliderToggle round",
        )
      ),
      span("Returned: ", child <-- returned2.map(identity[String]))
    ),
    div(id := "loader",
      div(
        div(
          display:= "flex",
          justifyContent:="center",
          height:="100px",
          div(cls := "loader-wheel")
        ),
        div(cls := "loader-text")
      )
    ),
    div(cls := "navbar",
      div(id := "navbarMenu",
        ul(
          li(cls := "navMenuItem",
            a(cls := "dropbtn","File"),
            div(cls := "dropdown-content",
              button(`type` := "button", id := "newAction","New"),
              button(`type` := "button", id := "openAction","Open"),
              button(`type` := "button", id := "saveAction","Save"),
              button(`type` := "button", id := "saveAsAction","Save as"),
              button(`type` := "button", id := "exportAction","Export Table"),
              button(`type` := "button", id := "recoverAction","Recover")
            )
          ),
          li(cls := "navMenuItem",
            a(cls := "dropbtn","Edit"),
            div(cls := "dropdown-content",
              button(`type` := "button", id := "undoAction", disabled := true,"Undo"),
              button(`type` := "button", id := "redoAction", disabled := true,"Redo"),
              hr(),
              button(`type` := "button", id := "cutAction","Cut"),
              button(`type` := "button", id := "copyAction","Copy"),
              button(`type` := "button", id := "pasteAction","Paste"),
              hr(),
              button(`type` := "button", id := "incIndentAction","Increase Indentation"),
              button(`type` := "button", id := "decIndentAction","Decrease Indentation"),
              hr(),
              button(`type` := "button", id := "selectAllAction","Select All"),
              label(
                input(`type` := "checkbox", id := "showFind"),
                span("Find")
              )
            )
          ),
          li(cls := "navMenuItem",
            a(cls := "dropbtn","View"),
            div(cls := "dropdown-content",
              button(`type` := "button", id := "increaseFontSize","Enlarge Font"),
              button(`type` := "button", id := "reduceFontSize","Reduce Font"),
              button(`type` := "button", id := "resetFontSize","Reset Font"),
              div(cls := "vertical-nav",
                div(
                  display:="flex",
                  span(marginRight:="auto","Font"),
                  span(margin:="auto 10px", color:="white","›")
                ),
                ul(cls := "sub-menu", id := "fontMenu",
                  li(
                    label(
                    input(`type` := "radio", name := "font", selected := false),
                    "Monospaced"
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "font", selected := false),
                    "Consolas"
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "font", selected := false),
                    "Courier View"
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "font", selected := false),
                    "Lucida Console"
                    )
                  )
                )
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
                input(`type` := "checkbox", id := "lineNumbers", checked := false),
                span("Line Numbers")
              ),
              button(`type` := "button", disabled := true,"Aspect Ratio")
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
              button(`type` := "button", id := "playMenuButton","Run"),
              button(`type` := "button", id := "pauseMenuButton", display:="none","Pause"),
              button(`type` := "button", id := "stepMenuButton","Step"),
              button(`type` := "button", id := "stopMenuButton", disabled := true,"Stop")
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
                ul(cls := "sub-menu", id := "traditionalSemantics",
                  li(
                    label(
                    input(`type` := "radio", name := "traditional", selected := false),
                    "2015 Reference"
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "traditional", selected := false),
                    "2015 Optimized"
                    )
                  )
                )
              ),
              div(cls := "vertical-nav",
                div(
                  display:="flex",
                  span(marginRight:="auto","Enclosure"),
                  span(margin:="auto 10px", color:="white","›")
                ),
                ul(cls := "sub-menu", id := "enclosureSemantics",
                  li(
                    label(
                    input(`type` := "radio", name := "enclosure", selected := true),
                    "2015 Enclosure"
                    )
                  ),
                  hr(),
                  li(
                    label(
                    input(`type` := "radio", name := "enclosure", selected := false),
                    "2013 PWL"
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "enclosure", selected := false),
                    "2013 EVT"
                    )
                  ),
                  hr(),
                  label(
                  input(`type` := "checkbox", id := "simulatorFields"),
                  span("Simulator Fields")
                  )
                )
              ),
              div(cls := "vertical-nav",
                div(
                  display:="flex",
                  span(marginRight:="auto","Deprecated"),
                  span(margin:="auto 10px", color:="white","›")
                ),
                ul(cls := "sub-menu", id := "deprecatedSemantics",
                  li(
                    label(
                    input(`type` := "radio", name := "deprecated", selected := false),
                    "2014 Reference"
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "deprecated", selected := false),
                    "2014 Optimized"
                    )
                  ),
                  hr(),
                  li(
                    label(
                    input(`type` := "radio", name := "deprecated", selected := false),
                    "2013 Reference"
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "deprecated", selected := false),
                    "2013 Optimized"
                    )
                  ),
                  hr(),
                  li(
                    label(
                    input(`type` := "radio", name := "deprecated", selected := false),
                    "2012 Reference"
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "deprecated", selected := false),
                    "2012 Optimized"
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "deprecated", selected := false),
                    "2012 Parallel"
                    )
                  )
                )
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
              button(`type` := "button", id := "startServer","Start Server"),
              button(`type` := "button", id := "stopServer", disabled := true,"Stop Server"),
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
            div(id := "editor")
          ),
          div(id := "upperBottomPane",
            div(id := "upperButtons",
              button(id := "playButton", cls := "tooltip fade", /*attr("data-title") := "Run Simulation",*/
                img(
                    src:="./icons/play.png"
                  )
              ),
              button(id := "pauseButton", cls := "tooltip fade", /*attr("data-title") := "Pause simulation",*/ display:= "none",
                img(
                    src:="./icons/pause.png"
                  )
              ),
              button(id := "stepButton", cls := "tooltip fade", /*attr("data-title") := "Compute one simulation step",*/
                img(
                    src:="./icons/step.png"
                  )
              ),
              button(id := "stopButton", cls := "tooltip fade", /*attr("data-title") := "Stop simulation (cannot resume)",*/
                img(
                    src:="./icons/stop.png"
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
            button(id := "consoleButton", cls := "ctablinks active","Console"),
            button(id := "browserButton", cls := "ctablinks","Browser")
          ),
          div(id := "consoleTab", cls := "ctabcontent", height:="calc(100% - 70px)", overflow:="auto",
            ul(id := "consoleAreaList")
          ),
          div(id := "browserTab", cls := "ctabcontent", display:="none", height:="calc(100% - 70px)", overflow:="auto",
            ul(id := "browserAreaList")
          )
        )
      ),
      div(id := "viewsPane",
        div(cls := "views",
          button(id := "plotButton", cls := "vtablinks active","Plot"),
          button(id := "traceButton", cls := "vtablinks","Table"),
          button(id := "threeDButton", cls := "vtablinks","_3D")
        ),
        div(id := "plotTab", cls := "vtabcontent"),
        div(id := "traceTab", cls := "vtabcontent",
          div(overflow:="auto",
            table(id := "traceTable")
          )
        ),
        div(id := "threeDtab", cls := "vtabcontent",
          div(id := "canvasPanel",
            div(textAlign:="center", display:="grid", alignContent:="center", height:="100%", width:="100%",
              span("3D panel not yet implemented"),
              canvas(id:="canvasPlot3D", width:="200", height:="500")
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
            button(`type` := "button", id := "saveAndContinue","Save and continue"),
            button(`type` := "button", id := "discardAndContinue","Discard and continue"),
            button(`type` := "button", /*onClick := "getResponse('cancel');",*/"Cancel")
          )
        )
      ),
      //script(src := "./ace-noconflict/ace.js", `type` := "text/javascript", charset := "utf-8"),
      //script(src := "./plotly.min.js"),
      //script(src := "./acumen.js")
    )
  )
}
