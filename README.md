# ACUMEN 3.0
This is the web version of Acumen, hosted on Heroku.

The backend uses the Play framework, together with Slick to access a
postgres database. The frontend uses the Laminar framework for UI rendering.

## Dev environment
To compile locally the full application, you must first clone the repository:
```
git clone https://github.com/affraike/full_scale_scala_app.git
cd full_scale_scala_app
```

Then, make sure that the file 'backend/conf/application.conf' is in this configuration :
```
slick.dbs.default {
  db = {
    #url = ${?JDBC_DATABASE_URL}
    driver = "org.postgresql.Driver"
    url="jdbc:postgresql://localhost:5432/testDB"
    user="postgres"
    password="super387"
  }
  profile = "slick.jdbc.PostgresProfile$"
  numThreads = 1
  driver="slick.driver.PostgresDriver$"
}
```

Next, you can use, in one command line (terminal)
```bash
# Frontend hot reload only on localhost:8080
sbt dev
```
and in another,
```bash
# Backend hot reload only on localhost:9000
sbt backend/run
```
Finally, open the browser on localhost:8080.

Please note that Acumen desktop api can no longer be launched inside the app.

## Deploy
In order to deploy, make sure that the file 'backend/conf/application.conf' is in this configuration :
```
slick.dbs.default {
  db = {
    url = ${?JDBC_DATABASE_URL}
    driver = "org.postgresql.Driver"
    #url="jdbc:postgresql://localhost:5432/testDB"
    #user="postgres"
    #password="super387"
  }
  profile = "slick.jdbc.PostgresProfile$"
  numThreads = 1
  driver="slick.driver.PostgresDriver$"
}
```

Then, in a terminal,
```
# Login to Heroku
heroku login

# Make sure to use the same name as in project/BackendSettings.scala
heroku apps:create APPNAME --region eu
heroku addons:create heroku-postgresql:hobby-dev

# Create a secret for the Play application
heroku config:set APPLICATION_SECRET=mycoolsecret

sbt clean stage backend/deployHeroku
```
