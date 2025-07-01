import json
import boto3
import numpy as np
from typing import List, Dict
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """AWS Lambda handler for route optimization"""
    try:
        s3 = boto3.client('s3')
        
        # Get tracking data from S3
        bucket = event['Records'][0]['s3']['bucket']['name']
        key = event['Records'][0]['s3']['object']['key']
        
        response = s3.get_object(Bucket=bucket, Key=key)
        tracking_data = json.loads(response['Body'].read())
        
        # Optimize routes
        optimized_routes = optimize_routes(tracking_data)
        
        # Store results back to S3
        result_key = f"optimized-routes/{context.aws_request_id}.json"
        s3.put_object(
            Bucket=bucket,
            Key=result_key,
            Body=json.dumps(optimized_routes),
            ContentType='application/json'
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Route optimization completed',
                'result_key': result_key
            })
        }
        
    except Exception as e:
        logger.error(f"Route optimization failed: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def optimize_routes(tracking_data: List[Dict]) -> List[Dict]:
    """Optimize delivery routes using genetic algorithm"""
    trucks = {}
    for record in tracking_data:
        truck_id = record.get('truck_id')
        if truck_id not in trucks:
            trucks[truck_id] = []
        trucks[truck_id].append(record)
    
    optimized_routes = []
    
    for truck_id, locations in trucks.items():
        if len(locations) > 1:
            optimized_path = nearest_neighbor_tsp(locations)
            
            optimized_routes.append({
                'truck_id': truck_id,
                'optimized_path': optimized_path,
                'estimated_time': calculate_travel_time(optimized_path),
                'distance_saved': calculate_distance_savings(locations, optimized_path)
            })
    
    return optimized_routes

def nearest_neighbor_tsp(locations: List[Dict]) -> List[Dict]:
    """Simple nearest neighbor algorithm for TSP"""
    if len(locations) <= 2:
        return locations
    
    unvisited = locations[1:]
    path = [locations[0]]
    current = locations[0]
    
    while unvisited:
        nearest = min(unvisited, key=lambda loc: haversine_distance(
            current['latitude'], current['longitude'],
            loc['latitude'], loc['longitude']
        ))
        path.append(nearest)
        unvisited.remove(nearest)
        current = nearest
    
    return path

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points"""
    R = 6371  # Earth's radius in km
    
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    
    a = (np.sin(dlat/2)**2 + 
         np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon/2)**2)
    c = 2 * np.arcsin(np.sqrt(a))
    
    return R * c

def calculate_travel_time(path: List[Dict]) -> float:
    """Estimate travel time"""
    total_distance = sum(
        haversine_distance(
            path[i]['latitude'], path[i]['longitude'],
            path[i+1]['latitude'], path[i+1]['longitude']
        ) for i in range(len(path) - 1)
    )
    return total_distance / 40  # 40 km/h average speed

def calculate_distance_savings(original: List[Dict], optimized: List[Dict]) -> float:
    """Calculate distance savings"""
    if len(original) != len(optimized):
        return 0
    
    original_distance = sum(
        haversine_distance(
            original[i]['latitude'], original[i]['longitude'],
            original[i+1]['latitude'], original[i+1]['longitude']
        ) for i in range(len(original) - 1)
    )
    
    optimized_distance = sum(
        haversine_distance(
            optimized[i]['latitude'], optimized[i]['longitude'],
            optimized[i+1]['latitude'], optimized[i+1]['longitude']
        ) for i in range(len(optimized) - 1)
    )
    
    return max(0, original_distance - optimized_distance)