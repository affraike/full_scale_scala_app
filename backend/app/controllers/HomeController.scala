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

import acumen.ui._

final case class AcumenInfo(action: String, file: String)

@Singleton
final class HomeController @Inject()(
    assets: Assets,
    errorHandler: HttpErrorHandler,
    config: Configuration,
    protected val dbConfigProvider: DatabaseConfigProvider,
    cc: ControllerComponents
)(implicit val ec: ExecutionContext)
    extends AbstractController(cc)
    with HasDatabaseConfigProvider[JdbcProfile]
    with testAcumenState {
  
  import App._
  var acumen = new App()

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

  def changeAcumenState(str: String): Action[AnyContent] = Action { implicit request: Request[AnyContent] =>
    setStateAcumen(str)
    Ok("Acumen state changed to " + str)
  }

  def acumenAction(str: String): Action[AnyContent] = Action { implicit request: Request[AnyContent] =>
    var obj = Json.parse(str)
    Ok("you've sent: action=" + (obj \ "action").as[String] + ";file=" + (obj \ "file").as[String])
  }

  def todo: Action[AnyContent] = TODO

}
