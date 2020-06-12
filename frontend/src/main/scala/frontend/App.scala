package frontend

import com.raquo.laminar.api.L._
import com.raquo.laminar.nodes.ReactiveHtmlElement
import org.scalajs.dom.html
import HttpClient._
import org.scalajs.dom
import org.scalajs.dom.{MouseEvent}
import sttp.client._
import io.circe.generic.auto._
import io.circe.parser.decode

import scala.concurrent.ExecutionContext.Implicits.global
import scala.scalajs.js
import scala.scalajs.js.annotation.JSImport
import scala.util.{Random, Success, Try}
import com.scalawarrior.scalajs.ace._
import java.lang.Float.parseFloat
import scala.util.{Try,Success,Failure}

object App {

  private val css = AppCSS
  dom.console.log(css.asInstanceOf[js.Object])

  //Implement backend/acumen communication
  val postBus2: EventBus[String] = new EventBus()

  val returned2: EventStream[String] = postBus2.events.flatMap(
    str =>
      EventStream.fromFuture(
        boilerplate
          .response(asStringAlways)
          .post(path("com").param("str", str.toString))
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

  //Handle all Buttons in the API
  val clickBus = new EventBus[dom.MouseEvent]
  val coordinateStream: EventStream[String] = clickBus.events.map(ev => handleClickEvents(ev.srcElement.id))

  def handleClickEvents(region: String): String = {
    region match {
      case "newAction" => newEditor()
      case "undoAction" => undo()
      case "redoAction" => redo()
      case "cutAction" => cut()
      case "copyAction" => copy()
      case "pasteAction" => paste()
      case "incIndentAction" => incindent()
      case "decIndentAction" => decindent()
      case "selectAllAction" => selectall()
      case "showFind" => find()
      case "increaseFontSize" => changefontsize(2)
      case "reduceFontSize" => changefontsize(-2)
      case "resetFontSize" => resetfontsize()
      case "monospaced" => font("Monospaced")
      case "consolas" => font("Consolas")
      case "courierView" => font("Courier View")
      case "lucidaConsole" => font("Lucida Console")
      case "dreamTheme" => theme("dreamweaver")
      case "textMateTheme" => theme("textMate")
      case "ambianceTheme" => theme("ambiance")
      case "draculaTheme" => theme("dracula")
      case "lineNumbers" => linenumbers()
      case "consoleButton" => changeActiveAera("ctab", region)
      case "browserButton" => changeActiveAera("ctab", region)
      case "plotButton" => changeActiveAera("vtab", region)
      case "traceButton" => changeActiveAera("vtab", region)
      case "threeDButton" => changeActiveAera("vtab", region)
      case "playButtonImg" | "playMenuButton" => playpause("play")
      case "pauseButtonImg" | "pauseMenuButton" => playpause("pause")
      case "stepButtonImg" | "stepMenuButton" => playpause("step")
      case "stopButtonImg" | "stopMenuButton" => playpause("stop")
      case "startServer" => startstopserver("start")
      case "stopServer" => startstopserver("stop")
    }

    return region
  }

  def newEditor(): Unit = {
    val editor = ace.edit("editor")
    editor.setTheme("ace/theme/dracula")
    editor.getSession().setMode("ace/mode/acumen")
  }

  def undo(): Unit = {
    val editor = ace.edit("editor")
    if (editor.session.getUndoManager().hasUndo()){
      editor.undo()
    }
  }

  def redo(): Unit = {
    val editor = ace.edit("editor")
    if (editor.session.getUndoManager().hasRedo()){
      editor.redo()
    }
  }

  def cut(): Unit = {
    val editor = ace.edit("editor")
    editor.focus()
    dom.document.execCommand("cut")
  }

  def copy(): Unit = {
    val editor = ace.edit("editor")
    editor.focus()
    dom.document.execCommand("copy")
  }

  def paste(): Unit = {
    val editor = ace.edit("editor")
    editor.focus()
    dom.document.execCommand("paste")
  }

  def incindent(): Unit = {
    val editor = ace.edit("editor")
    editor.indent()
  }

  def decindent(): Unit = {
    val editor = ace.edit("editor")
    editor.blockOutdent()
  }

  def selectall(): Unit = {
    val editor = ace.edit("editor")
    editor.selectAll()
  }

  def find(): Unit = {
    val editor = ace.edit("editor")
    editor.execCommand("find")
  }

  def theme(th: String): Unit = {
    val editor = ace.edit("editor")
    editor.setTheme("ace/theme/" + th)
  }

  def linenumbers(): Unit = {
    val editor = ace.edit("editor")
    if (dom.document.getElementById("lineNumbers").asInstanceOf[html.Input].checked == true) { editor.renderer.setShowGutter(true)}
    else { editor.renderer.setShowGutter(false)}
  }

  def changefontsize(value: Float): Unit = {
    val style = dom.window.getComputedStyle(dom.document.getElementById("editor").asInstanceOf[html.Div], null).getPropertyValue("font-size")
    var currentSize = 0.0
    style.length match {
      case 4 => {currentSize = parseFloat(style.take(2))}
      case 3 => {currentSize = parseFloat(style.take(1))}
    }
    val newFontSize = currentSize + value + "px"
    dom.console.log(currentSize)
    val editor = ace.edit("editor")
    editor.setFontSize(newFontSize)
  }

  def resetfontsize(): Unit = {
    val editor = ace.edit("editor")
    editor.setFontSize("12px")
  }

  def font(fontFamily: String): Unit = {
    dom.document.getElementById("editor").asInstanceOf[html.Div].style.fontFamily = fontFamily
  }

  def changeActiveAera(area: String, subarea: String) : Unit = {
    area match{
      case "ctab" => {
        subarea match {
          case "consoleButton" => {
            dom.document.getElementById("browserButton").asInstanceOf[html.Button].className = "ctablinks"
            dom.document.getElementById(subarea).asInstanceOf[html.Button].className += " active"
          }
          case "browserButton" => {
            dom.document.getElementById("consoleButton").asInstanceOf[html.Button].className = "ctablinks"
            dom.document.getElementById(subarea).asInstanceOf[html.Button].className += " active"
          }
        }
      }
      case "vtab" => {
        subarea match {
          case "plotButton" => {
            dom.document.getElementById("traceTab").asInstanceOf[html.Div].style.display = "none"
            dom.document.getElementById("threeDTab").asInstanceOf[html.Div].style.display = "none"
            dom.document.getElementById("traceButton").asInstanceOf[html.Button].className = "vtablinks"
            dom.document.getElementById("threeDButton").asInstanceOf[html.Button].className = "vtablinks"
            dom.document.getElementById(subarea).asInstanceOf[html.Button].className += " active"
            dom.document.getElementById("plotTab").asInstanceOf[html.Div].style.display = "block"
          }
          case "traceButton" => {
            dom.document.getElementById("plotTab").asInstanceOf[html.Div].style.display = "none"
            dom.document.getElementById("threeDTab").asInstanceOf[html.Div].style.display = "none"
            dom.document.getElementById("plotButton").asInstanceOf[html.Button].className = "vtablinks"
            dom.document.getElementById("threeDButton").asInstanceOf[html.Button].className = "vtablinks"
            dom.document.getElementById(subarea).asInstanceOf[html.Button].className += " active"
            dom.document.getElementById("traceTab").asInstanceOf[html.Div].style.display = "block"
          }
          case "threeDButton" => {
            dom.document.getElementById("plotTab").asInstanceOf[html.Div].style.display = "none"
            dom.document.getElementById("traceTab").asInstanceOf[html.Div].style.display = "none"
            dom.document.getElementById("plotButton").asInstanceOf[html.Button].className = "vtablinks"
            dom.document.getElementById("traceButton").asInstanceOf[html.Button].className = "vtablinks"
            dom.document.getElementById(subarea).asInstanceOf[html.Button].className += " active"
            dom.document.getElementById("threeDTab").asInstanceOf[html.Div].style.display = "block"
          }
        }
      }
    }
  }

  def playpause(state: String): Unit = {
    state match {
      case "play" => {
        dom.document.getElementById("playButton").asInstanceOf[html.Button].style.display = "none"
        dom.document.getElementById("playMenuButton").asInstanceOf[html.Button].style.display = "none"
        dom.document.getElementById("stepButton").asInstanceOf[html.Button].disabled = true
        dom.document.getElementById("stepMenuButton").asInstanceOf[html.Button].disabled = true
        dom.document.getElementById("stopButton").asInstanceOf[html.Button].disabled = false
        dom.document.getElementById("stopMenuButton").asInstanceOf[html.Button].disabled = false
        dom.document.getElementById("pauseButton").asInstanceOf[html.Button].style.display = "block"
        dom.document.getElementById("pauseMenuButton").asInstanceOf[html.Button].style.display = "block"
      }
      case "pause" => {
        dom.document.getElementById("pauseButton").asInstanceOf[html.Button].style.display = "none"
        dom.document.getElementById("pauseMenuButton").asInstanceOf[html.Button].style.display = "none"
        dom.document.getElementById("stepButton").asInstanceOf[html.Button].disabled = false
        dom.document.getElementById("stepMenuButton").asInstanceOf[html.Button].disabled = false
        dom.document.getElementById("playButton").asInstanceOf[html.Button].style.display = "block"
        dom.document.getElementById("playMenuButton").asInstanceOf[html.Button].style.display = "block"
      }
      case "step" => {
        dom.document.getElementById("stopMenuButton").asInstanceOf[html.Button].disabled = false
      }
      case "stop" => {
        dom.document.getElementById("pauseButton").asInstanceOf[html.Button].style.display = "none"
        dom.document.getElementById("pauseMenuButton").asInstanceOf[html.Button].style.display = "none"
        dom.document.getElementById("stopMenuButton").asInstanceOf[html.Button].disabled = true
        dom.document.getElementById("stopButton").asInstanceOf[html.Button].disabled = true
        dom.document.getElementById("stepButton").asInstanceOf[html.Button].disabled = false
        dom.document.getElementById("stepMenuButton").asInstanceOf[html.Button].disabled = false
        dom.document.getElementById("playButton").asInstanceOf[html.Button].style.display = "block"
        dom.document.getElementById("playMenuButton").asInstanceOf[html.Button].style.display = "block"
      }
    }
  }

  def startstopserver(state: String): Unit = {
    state match {
      case "start" => {
        dom.document.getElementById("startServer").asInstanceOf[html.Button].disabled = true
        dom.document.getElementById("stopServer").asInstanceOf[html.Button].disabled = false
        dom.document.getElementById("resetDevice").asInstanceOf[html.Button].disabled = false
        dom.document.getElementById("serverLink").asInstanceOf[html.Button].disabled = false
      }
      case "stop" => {
        dom.document.getElementById("startServer").asInstanceOf[html.Button].disabled = false
        dom.document.getElementById("stopServer").asInstanceOf[html.Button].disabled = true
        dom.document.getElementById("resetDevice").asInstanceOf[html.Button].disabled = true
        dom.document.getElementById("serverLink").asInstanceOf[html.Button].disabled = true
      }
    }
  }

  // Handle API rendering
  def apply(): ReactiveHtmlElement[html.Div] = div(
    className := "App",
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
    p("Button: ", child <-- coordinateStream.map(identity[String])),
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
              button(`type` := "button", id := "newAction","New",
                onClick --> clickBus.writer
              ),
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
              button(`type` := "button", id := "undoAction","Undo",
                onClick --> clickBus.writer
              ),
              button(`type` := "button", id := "redoAction","Redo",
                onClick --> clickBus.writer
              ),
              hr(),
              button(`type` := "button", id := "cutAction","Cut",
                onClick --> clickBus.writer
              ),
              button(`type` := "button", id := "copyAction","Copy",
                onClick --> clickBus.writer
              ),
              button(`type` := "button", id := "pasteAction", disabled:=true, "Paste",
                onClick --> clickBus.writer
              ),
              hr(),
              button(`type` := "button", id := "incIndentAction","Increase Indentation",
                onClick --> clickBus.writer
              ),
              button(`type` := "button", id := "decIndentAction","Decrease Indentation",
                onClick --> clickBus.writer
              ),
              hr(),
              button(`type` := "button", id := "selectAllAction","Select All",
                onClick --> clickBus.writer
              ),
              button(`type` := "button", id := "showFind","Find",
                onClick --> clickBus.writer
              )
            )
          ),
          li(cls := "navMenuItem",
            a(cls := "dropbtn","View"),
            div(cls := "dropdown-content",
              button(`type` := "button", id := "increaseFontSize","Enlarge Font",
                onClick --> clickBus.writer
              ),
              button(`type` := "button", id := "reduceFontSize","Reduce Font",
                onClick --> clickBus.writer
              ),
              button(`type` := "button", id := "resetFontSize","Reset Font",
                onClick --> clickBus.writer
              ),
              div(cls := "vertical-nav",
                div(
                  display:="flex",
                  span(marginRight:="auto","Font"),
                  span(margin:="auto 10px", color:="white","›")
                ),
                ul(cls := "sub-menu", id := "fontMenu",
                  li(
                    label(
                    input(`type` := "radio", name := "font", id:="monospaced", checked := false),
                    "Monospaced",
                    onClick --> clickBus.writer
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "font", id:="consolas", checked := true),
                    "Consolas",
                    onClick --> clickBus.writer
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "font", id:="courierView", checked:= false),
                    "Courier View",
                    onClick --> clickBus.writer
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "font", id:="lucidaConsole", checked := false),
                    "Lucida Console",
                    onClick --> clickBus.writer
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
                ul(cls := "sub-menu", id := "themeMenu",
                  li(
                    label(
                    input(`type` := "radio", name := "font", id:="dreamTheme", checked := false),
                    "dreamweaver",
                    onClick --> clickBus.writer
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "font", id:="textMateTheme", checked := false),
                    "textMate",
                    onClick --> clickBus.writer
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "font", id:="ambianceTheme", checked := false),
                    "ambiance",
                    onClick --> clickBus.writer
                    )
                  ),
                  li(
                    label(
                    input(`type` := "radio", name := "font", id:="draculaTheme", checked := true),
                    "dracula",
                    onClick --> clickBus.writer
                    )
                  )
                )
              ),
              label(
                input(`type` := "checkbox", id := "lineNumbers", checked := true,
                  onClick --> clickBus.writer
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
              button(`type` := "button", id := "playMenuButton","Run",
                onClick --> clickBus.writer
              ),
              button(`type` := "button", id := "pauseMenuButton", display:="none","Pause",
                onClick --> clickBus.writer
              ),
              button(`type` := "button", id := "stepMenuButton","Step",
                onClick --> clickBus.writer
              ),
              button(`type` := "button", id := "stopMenuButton", disabled := true,"Stop",
                onClick --> clickBus.writer
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
              button(`type` := "button", id := "startServer","Start Server",
                onClick --> clickBus.writer
              ),
              button(`type` := "button", id := "stopServer", disabled := true,"Stop Server",
                onClick --> clickBus.writer
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
                    id := "playButtonImg",
                    onClick --> clickBus.writer
                )
              ),
              button(id := "pauseButton", cls := "tooltip fade", name := "Pause simulation", display:= "none",
                img(
                    src:="./icons/pause.png",
                    id := "pauseButtonImg",
                    onClick --> clickBus.writer
                )
              ),
              button(id := "stepButton", cls := "tooltip fade", name := "Compute one simulation step",
                img(
                    src:="./icons/step.png",
                    id := "stepButtonImg",
                    onClick --> clickBus.writer
                  )
              ),
              button(id := "stopButton", cls := "tooltip fade", name := "Stop simulation (cannot resume)", disabled:=true,
                img(
                    src:="./icons/stop.png",
                    id := "stopButtonImg",
                    onClick --> clickBus.writer
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
            button(id := "consoleButton", cls := "ctablinks active","Console",
              onClick --> clickBus.writer
            ),
            button(id := "browserButton", cls := "ctablinks","Browser",
              onClick --> clickBus.writer
            )
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
          button(id := "plotButton", cls := "vtablinks active","Plot",
            onClick --> clickBus.writer
          ),
          button(id := "traceButton", cls := "vtablinks","Table",
            onClick --> clickBus.writer
          ),
          button(id := "threeDButton", cls := "vtablinks","_3D",
            onClick --> clickBus.writer
          )
        ),
        div(id := "plotTab", cls := "vtabcontent", display:= "none"),
        div(id := "traceTab", cls := "vtabcontent", display:= "none",
          div(overflow:="auto",
            table(id := "traceTable")
          )
        ),
        div(id := "threeDTab", cls := "vtabcontent", display:= "none",
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
            button(`type` := "button", id := "saveAndContinue","Save and continue"),
            button(`type` := "button", id := "discardAndContinue","Discard and continue"),
            button(`type` := "button", /*onClick := "getResponse('cancel');",*/"Cancel")
          )
        )
      )
    ),
    script(
      typ:="text/javascript",
      src:="./ace-noconflict/ace.js"
    )
  )
}
