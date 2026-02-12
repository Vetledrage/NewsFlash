package app

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

// Test med : http://localhost:8080/h2-console

@SpringBootApplication
class App

fun main(args: Array<String>) {
    runApplication<App>(*args)
}
