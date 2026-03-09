# Smart IoT Platform -- Social Login Summary

## Overview

This project implements a **Smart IoT Monitoring System** that supports
authentication using multiple **Social Login providers**.\
The goal is to allow users to easily sign in to both the **Web
Dashboard** and **Mobile Application** without creating a separate
account.

Supported providers:

-   Google Login
-   LINE Login
-   Facebook Login

The system uses **OAuth 2.0 authentication** to verify user identity.

------------------------------------------------------------------------

# System Architecture

User\
↓\
Social Login Button\
↓\
Google / LINE / Facebook\
↓\
Frontend (React Web / Flutter Mobile)\
↓\
Receive OAuth Token\
↓\
Backend API (Node.js / NestJS)\
↓\
Verify Token with Provider\
↓\
Create or Login User in Database\
↓\
Access IoT Dashboard

------------------------------------------------------------------------

# 1. Google Login

Google Login is implemented using **Google OAuth 2.0** via Google Cloud
Console.

Required credentials:

-   Client ID
-   Client Secret

Capabilities:

-   Login with Google account
-   Works for Web and Mobile applications
-   Returns user profile information (name, email, picture)

------------------------------------------------------------------------

# 2. LINE Login

LINE Login is configured using the **LINE Developers Console**.

Required credentials:

-   Channel ID
-   Channel Secret

Capabilities:

-   Login using LINE account
-   Popular for users in Thailand
-   Returns user profile and basic account information

------------------------------------------------------------------------

# 3. Facebook Login

Facebook Login is implemented using **Meta for Developers**.

Required credentials:

-   App ID
-   App Secret

Capabilities:

-   Login using Facebook account
-   Access user profile information
-   Widely supported across web and mobile platforms

------------------------------------------------------------------------

# Example Login Buttons

Frontend login interface may contain buttons such as:

Continue with Google\
Continue with LINE\
Continue with Facebook

Users can choose their preferred authentication provider.

------------------------------------------------------------------------

# Benefits of Social Login

1.  Faster user registration\
2.  No password management required\
3.  Improved security using trusted providers\
4.  Compatible with Web and Mobile apps

------------------------------------------------------------------------

# IoT Platform Structure

Frontend - React Web Dashboard - Flutter Mobile Application

Backend - Node.js / NestJS API - Authentication service - IoT data
service

IoT Functions - Monitor sensor data - Control IoT devices - View
real‑time system status

------------------------------------------------------------------------

# Conclusion

The Smart IoT platform integrates multiple **Social Login providers** to
simplify authentication and improve user experience.\
By combining Google, LINE, and Facebook login methods, the system
ensures flexible and convenient access for users across different
platforms.
