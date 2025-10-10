CREATE DATABASE IF NOT EXISTS ice_tracking;
USE ice_tracking;

-- Users (authentication)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    password VARCHAR(255),
    role ENUM('driver', 'admin', 'owner')
);

-- Drivers
CREATE TABLE drivers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_code VARCHAR(20),
    full_name VARCHAR(100),
    national_id VARCHAR(13),
    license_number VARCHAR(50),
    username VARCHAR(50),
    address TEXT,
    phone VARCHAR(15),
    start_date DATE
);

-- Trucks
CREATE TABLE trucks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    truck_code VARCHAR(20),
    plate_number VARCHAR(20),
    model VARCHAR(50),
    color VARCHAR(30),
    gps_code VARCHAR(50)
);

-- Shops
CREATE TABLE shops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_code VARCHAR(20),
    shop_name VARCHAR(100),
    phone VARCHAR(15),
    address TEXT,
    latitude DOUBLE,
    longitude DOUBLE
);

-- Tracking
CREATE TABLE tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tracking_code VARCHAR(20),
    shop_id INT,
    latitude DOUBLE,
    longitude DOUBLE,
    truck_id INT,
    driver_id INT,
    gps_code VARCHAR(50),
    timestamp DATETIME
);

-- Alerts
CREATE TABLE alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    truck_id INT,
    driver_id INT,
    message TEXT,
    alert_time DATETIME
);
