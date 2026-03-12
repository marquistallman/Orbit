package com.authorizedact.auth_service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GreetingController {

    @Value("${app.greeting}")
    private String greeting;

    @GetMapping("/hello")
    public String sayHello() {
        return greeting;
    }
}