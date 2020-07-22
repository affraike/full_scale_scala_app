package controllers

import javax.inject._
import play.api.Configuration
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.api.http.HttpErrorHandler
import play.api.mvc._
import play.api.libs.json._
import utils.WriteableImplicits._
import io.circe.generic.auto._
import models.SharedModelClass
import slick.jdbc.JdbcProfile
import utils.ReadsImplicits._
import utils.database.tables.SharedModelTable
import slick.jdbc.PostgresProfile.api._

import scala.concurrent.{ExecutionContext}

import play.api.libs.streams.ActorFlow
import akka.actor.ActorSystem
import akka.stream.Materializer

import acumen.Main
import acumen.ui._

final case class AcumenInfo(action: String, file: String)

@Singleton
final class HomeController @Inject()(
    assets: Assets,
    errorHandler: HttpErrorHandler,
    config: Configuration,
    protected val dbConfigProvider: DatabaseConfigProvider,
    cc: ControllerComponents
)(implicit val ec: ExecutionContext, system: ActorSystem, mat: Materializer)
    extends AbstractController(cc)
    with HasDatabaseConfigProvider[JdbcProfile]
    with AcumenController {

  def index: Action[AnyContent] = assets.at("index.html")

  def assetOrDefault(resource: String): Action[AnyContent] = {
    if (resource.startsWith(config.get[String]("apiPrefix"))) {
      Action.async(r => errorHandler.onClientError(r, NOT_FOUND, "Not found"))
    } else {
      if (resource.contains(".")) assets.at(resource) else index
    }
  }

  def hello(): Action[AnyContent] = Action { implicit request: Request[AnyContent] =>
    Ok("Hello from play! BTW, Acumen is " + getStateAcumen())
    //Call a method from Acumen's class "App.scala" : Done

  }

  def helloNbr(nbr: Int): Action[AnyContent] = Action { implicit request: Request[AnyContent] =>
    Ok(s"You gave me $nbr")
  }

  def initAcumen(): Action[AnyContent] = Action { implicit request: Request[AnyContent] =>
    if (getInitState()){
      setInitState(false)
      Main.main(Array())
    }
    Ok("Acumen Initialized")
  }

  def changeAcumenState(str: String): Action[AnyContent] = Action { implicit request: Request[AnyContent] =>
    setStateAcumen(str)
    Ok("Acumen state changed to " + str)
  }

  def getAcumenMessage(): Action[AnyContent] = Action { implicit request: Request[AnyContent] =>
    if (!Main.waitingList.isEmpty){
      var pop = Main.waitingList(0)
      Main.waitingList.remove(0)
      Ok(pop)
    } else {
      Ok("Buffer is empty")
    }
  }

  def acumenAction(): Action[AnyContent] = Action { implicit request: Request[AnyContent] =>
    val str = request.body.asText.get.toString()
    App.ui.deserializeSocketInput(str)
    Ok("task completed: " + str)
  }

  def todo: Action[AnyContent] = TODO

}
