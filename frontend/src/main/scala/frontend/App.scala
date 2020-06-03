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
          cls:="slider round",
        )
      ),
      span("Returned: ", child <-- returned2.map(identity[String]))
    )
  )
}
