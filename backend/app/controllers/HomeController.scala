package controllers

import javax.inject._
import play.api.Configuration
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.api.http.HttpErrorHandler
import play.api.mvc._
import utils.WriteableImplicits._
import io.circe.generic.auto._
import models.SharedModelClass
import slick.jdbc.JdbcProfile
import utils.ReadsImplicits._
import utils.database.tables.SharedModelTable
import slick.jdbc.PostgresProfile.api._

import scala.concurrent.ExecutionContext

import acumen.ui._

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
    //Call a method from Acumen's class "App.scala"

  }

  def helloNbr(nbr: Int): Action[AnyContent] = Action { implicit request: Request[AnyContent] =>
    Ok(s"You gave me $nbr")
  }

  def todo: Action[AnyContent] = TODO

}
