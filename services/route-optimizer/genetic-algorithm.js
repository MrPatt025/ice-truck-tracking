class RouteOptimizer {
  constructor(locations, constraints = {}) {
    this.locations = locations;
    this.populationSize = constraints.populationSize || 50;
    this.generations = constraints.generations || 100;
    this.mutationRate = constraints.mutationRate || 0.01;
  }

  // Calculate distance between two points
  calculateDistance(loc1, loc2) {
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // Calculate total route distance
  calculateRouteDistance(route) {
    let totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      totalDistance += this.calculateDistance(route[i], route[i + 1]);
    }
    return totalDistance;
  }

  // Generate random route
  generateRandomRoute() {
    const route = [...this.locations];
    for (let i = route.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [route[i], route[j]] = [route[j], route[i]];
    }
    return route;
  }

  // Crossover operation
  crossover(parent1, parent2) {
    const start = Math.floor(Math.random() * parent1.length);
    const end = Math.floor(Math.random() * (parent1.length - start)) + start;
    
    const child = new Array(parent1.length);
    const segment = parent1.slice(start, end);
    
    segment.forEach((city, index) => {
      child[start + index] = city;
    });
    
    let childIndex = 0;
    parent2.forEach(city => {
      if (!segment.includes(city)) {
        while (child[childIndex] !== undefined) childIndex++;
        child[childIndex] = city;
      }
    });
    
    return child;
  }

  // Mutation operation
  mutate(route) {
    if (Math.random() < this.mutationRate) {
      const i = Math.floor(Math.random() * route.length);
      const j = Math.floor(Math.random() * route.length);
      [route[i], route[j]] = [route[j], route[i]];
    }
    return route;
  }

  // Main optimization algorithm
  optimize() {
    // Initialize population
    let population = [];
    for (let i = 0; i < this.populationSize; i++) {
      population.push(this.generateRandomRoute());
    }

    let bestRoute = null;
    let bestDistance = Infinity;

    // Evolution loop
    for (let generation = 0; generation < this.generations; generation++) {
      // Calculate fitness for each route
      const fitness = population.map(route => ({
        route,
        distance: this.calculateRouteDistance(route),
        fitness: 1 / this.calculateRouteDistance(route)
      }));

      // Sort by fitness
      fitness.sort((a, b) => b.fitness - a.fitness);

      // Track best route
      if (fitness[0].distance < bestDistance) {
        bestDistance = fitness[0].distance;
        bestRoute = [...fitness[0].route];
      }

      // Selection and reproduction
      const newPopulation = [];
      
      // Keep best 20%
      const eliteCount = Math.floor(this.populationSize * 0.2);
      for (let i = 0; i < eliteCount; i++) {
        newPopulation.push([...fitness[i].route]);
      }

      // Generate offspring
      while (newPopulation.length < this.populationSize) {
        const parent1 = this.tournamentSelection(fitness);
        const parent2 = this.tournamentSelection(fitness);
        const child = this.crossover(parent1, parent2);
        newPopulation.push(this.mutate(child));
      }

      population = newPopulation;
    }

    return {
      route: bestRoute,
      distance: bestDistance,
      estimatedTime: bestDistance / 40 * 60, // Assuming 40 km/h average speed
      waypoints: bestRoute.map((loc, index) => ({
        order: index + 1,
        location: loc,
        estimatedArrival: new Date(Date.now() + (bestDistance / 40 * 60 * 60 * 1000 * index / bestRoute.length))
      }))
    };
  }

  // Tournament selection
  tournamentSelection(fitness) {
    const tournamentSize = 5;
    let best = fitness[Math.floor(Math.random() * fitness.length)];
    
    for (let i = 1; i < tournamentSize; i++) {
      const competitor = fitness[Math.floor(Math.random() * fitness.length)];
      if (competitor.fitness > best.fitness) {
        best = competitor;
      }
    }
    
    return best.route;
  }
}

module.exports = RouteOptimizer;