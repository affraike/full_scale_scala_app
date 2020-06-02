import sbt.Keys.{resolvers, _}
import sbtcrossproject.CrossPlugin.autoImport.{CrossType, crossProject}

name := "Full Stack Scala in Heroku"

version := "0.1"
scalaVersion   := "2.12.10"
scalaBinaryVersion  := "2.12.10"
crossScalaVersions := Seq("2.12.10", "2.11.6")

scalacOptions ++= Seq(
  "-deprecation",
  "-feature"
)

lazy val `shared` = crossProject(JSPlatform, JVMPlatform)
  .crossType(CrossType.Pure)
  .disablePlugins(HerokuPlugin) // no need of Heroku for shared project
  .settings(
    scalaVersion := "2.12.10",
    SharedSettings()
  )
  .jvmSettings(
    SharedSettings.jvmSettings
  )

lazy val sharedJVM = `shared`.jvm
lazy val sharedJS = `shared`.js

lazy val acumen = Project(id = "acumen", base = file("./acumen"))
  //.enablePlugins(PlayScala)//if using playscala..or whatever
  .settings(
    name := "acumen",
    scalaVersion := "2.12.10",

    resolvers ++= Seq(
      ("snapshots" at "http://oss.sonatype.org/content/repositories/snapshots").withAllowInsecureProtocol(true),
      ("releases"  at "http://oss.sonatype.org/content/repositories/releases").withAllowInsecureProtocol(true)
    ),
      resolvers += "Sonatype OSS Snapshots" at "https://oss.sonatype.org/content/repositories/snapshots",
  //  BackendSettings(),
   // BackendSettings.herokuSettings(),
  //  libraryDependencies += guice // dependency injection
  )
  //.dependsOn(sharedJVM)

/** Backend server uses Play framework */
lazy val `backend` = (project in file("./backend"))
  .enablePlugins(PlayScala)//if using playscala..or whatever
  .settings(
    scalaVersion := "2.12.10",
    BackendSettings(),
    BackendSettings.herokuSettings(),
    libraryDependencies += guice // dependency injection
  )
  .aggregate(acumen)
  .dependsOn(acumen, sharedJVM)

/** Frontend will use react with Slinky */
lazy val `frontend` = (project in file("./frontend"))
  .disablePlugins(HerokuPlugin)
  .enablePlugins(ScalaJSBundlerPlugin)
  .settings(
    scalaVersion := "2.12.10",
    FrontendSettings()
  )
  .dependsOn(sharedJS)

addCommandAlias("dev", ";frontend/fastOptJS::startWebpackDevServer;~frontend/fastOptJS")

addCommandAlias("build", "frontend/fullOptJS::webpack")


stage := {
  val webpackValue = (frontend / Compile / fullOptJS / webpack).value
  println(s"Webpack value is $webpackValue")
  (stage in backend).value
}

// sbt clean stage backend/deploy
//HELP: https://html.developreference.com/article/21342304/Custom+run+task+for+subproject+with+arguments+from+build.sbt%3F