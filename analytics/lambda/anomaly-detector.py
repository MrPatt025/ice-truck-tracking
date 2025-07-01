import json
import boto3
import numpy as np
from datetime import datetime, timedelta
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """Detect anomalies in truck telemetry data"""
    try:
        # Process incoming telemetry data
        telemetry_data = json.loads(event['body']) if 'body' in event else event
        
        anomalies = []
        
        for record in telemetry_data:
            # Check for GPS anomalies
            gps_anomaly = detect_gps_anomaly(record)
            if gps_anomaly:
                anomalies.append(gps_anomaly)
            
            # Check for temperature anomalies
            temp_anomaly = detect_temperature_anomaly(record)
            if temp_anomaly:
                anomalies.append(temp_anomaly)
            
            # Check for speed anomalies
            speed_anomaly = detect_speed_anomaly(record)
            if speed_anomaly:
                anomalies.append(speed_anomaly)
        
        # Send alerts if anomalies detected
        if anomalies:
            send_alerts(anomalies)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'processed_records': len(telemetry_data),
                'anomalies_detected': len(anomalies),
                'anomalies': anomalies
            })
        }
        
    except Exception as e:
        logger.error(f"Anomaly detection failed: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def detect_gps_anomaly(record):
    """Detect GPS jump anomalies"""
    lat = record.get('latitude', 0)
    lon = record.get('longitude', 0)
    truck_id = record.get('truck_id')
    timestamp = record.get('timestamp')
    
    # Check for impossible coordinates
    if abs(lat) > 90 or abs(lon) > 180:
        return {
            'type': 'gps_invalid_coordinates',
            'truck_id': truck_id,
            'timestamp': timestamp,
            'severity': 'high',
            'message': f'Invalid GPS coordinates: {lat}, {lon}'
        }
    
    # Check for GPS jumps (simplified - would need historical data)
    # This is a placeholder for more sophisticated anomaly detection
    if lat == 0 and lon == 0:
        return {
            'type': 'gps_signal_lost',
            'truck_id': truck_id,
            'timestamp': timestamp,
            'severity': 'medium',
            'message': 'GPS signal lost - coordinates at 0,0'
        }
    
    return None

def detect_temperature_anomaly(record):
    """Detect temperature anomalies for ice trucks"""
    temperature = record.get('temperature')
    truck_id = record.get('truck_id')
    timestamp = record.get('timestamp')
    
    if temperature is None:
        return None
    
    # Ice trucks should maintain temperature below 0°C
    if temperature > 5:
        return {
            'type': 'temperature_high',
            'truck_id': truck_id,
            'timestamp': timestamp,
            'severity': 'critical',
            'message': f'Temperature too high: {temperature}°C - Ice may be melting!'
        }
    
    # Extremely low temperatures might indicate sensor malfunction
    if temperature < -30:
        return {
            'type': 'temperature_sensor_error',
            'truck_id': truck_id,
            'timestamp': timestamp,
            'severity': 'medium',
            'message': f'Unusually low temperature: {temperature}°C - Check sensor'
        }
    
    return None

def detect_speed_anomaly(record):
    """Detect speed anomalies"""
    speed = record.get('speed', 0)
    truck_id = record.get('truck_id')
    timestamp = record.get('timestamp')
    
    # Check for excessive speed
    if speed > 120:  # km/h
        return {
            'type': 'speed_excessive',
            'truck_id': truck_id,
            'timestamp': timestamp,
            'severity': 'high',
            'message': f'Excessive speed detected: {speed} km/h'
        }
    
    # Check for negative speed (sensor error)
    if speed < 0:
        return {
            'type': 'speed_sensor_error',
            'truck_id': truck_id,
            'timestamp': timestamp,
            'severity': 'low',
            'message': f'Invalid speed reading: {speed} km/h'
        }
    
    return None

def send_alerts(anomalies):
    """Send alerts via SNS"""
    try:
        sns = boto3.client('sns')
        topic_arn = 'arn:aws:sns:us-west-2:123456789012:ice-truck-alerts'
        
        for anomaly in anomalies:
            message = {
                'alert_type': 'anomaly_detected',
                'truck_id': anomaly['truck_id'],
                'anomaly_type': anomaly['type'],
                'severity': anomaly['severity'],
                'message': anomaly['message'],
                'timestamp': anomaly['timestamp']
            }
            
            sns.publish(
                TopicArn=topic_arn,
                Message=json.dumps(message),
                Subject=f"🚨 Ice Truck Alert: {anomaly['type']}"
            )
            
    except Exception as e:
        logger.error(f"Failed to send alerts: {str(e)}")