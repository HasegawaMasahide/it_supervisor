package com.example.crm.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;

@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            // ISSUE: 全てのエンドポイントを許可（認証なし）
            .authorizeRequests()
                .antMatchers("/api/**").permitAll()
                .antMatchers("/customers/**").permitAll()
                .antMatchers("/deals/**").permitAll()
                .antMatchers("/admin/**").permitAll()  // ISSUE: 管理者ページも認証不要
                .anyRequest().permitAll()
            .and()
            // ISSUE: Basic認証のみ（セッション管理がない）
            .httpBasic()
            .and()
            // ISSUE: CSRF対策が無効化
            .csrf().disable()
            // ISSUE: フレームオプションが無効（クリックジャッキング脆弱性）
            .headers().frameOptions().disable();
    }

    @Override
    protected void configure(AuthenticationManagerBuilder auth) throws Exception {
        // ISSUE: パスワードが平文でハードコーディング
        // ISSUE: 全ユーザーに管理者権限（ADMIN）を付与
        auth.inMemoryAuthentication()
            .withUser("admin")
            .password("admin123")  // ISSUE: 平文パスワード
            .roles("ADMIN", "USER")
            .and()
            .withUser("user")
            .password("user123")   // ISSUE: 平文パスワード
            .roles("ADMIN", "USER")  // ISSUE: 一般ユーザーにも管理者権限
            .and()
            .withUser("guest")
            .password("guest")
            .roles("ADMIN", "USER");  // ISSUE: ゲストにも管理者権限

        // ISSUE: ブルートフォース対策がない
        // ISSUE: アカウントロック機能がない
        // ISSUE: パスワードポリシーがない
    }
}
