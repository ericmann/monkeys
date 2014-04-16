// Import scripts for managing the Genome object and calculating genetics matches
importScripts( 'shakespeare.genome.js' );

var probabilities = {
		cross_over: 0.87,
		mutation:   0.01
	},
	population = [],
	maxFitness = 0,
	sumOfMaxMinusFitness = 0
_validChars = [];

// Initialize valid characters
_validChars[0] = String.fromCharCode( 10 );
_validChars[1] = String.fromCharCode( 13 );
for ( var i = 2, pos = 32; i < 97; i ++, pos ++ ) {
	_validChars[ i ] = String.fromCharCode( pos );
}

onmessage = function ( event ) {
	var data = JSON.parse( event.data );

	switch ( data.method ) {
		case 'cleanup':
			// Close out the worker
			self.close();
			break;
		case 'spawn':
			// Collect our children
			var children = create_children( data.parents );

			// Send our children back to the task runner
			postMessage( JSON.stringify( { 'children': children } ) );
			break;
	}
};

/**
 * Create a pair of child strings given an initial array of high-fitness candidates.
 *
 * @param {Array} initial
 */
function create_children( initial ) {
	var children = [];

	for ( i = 0; i < l; i ++ ) {
		maxFitness = Math.max( maxFitness, initial[i].fitness );
	}
	maxFitness += 1;

	for ( i = 0; i < l; i ++ ) {
		sumOfMaxMinusFitness += ( maxFitness - initial[i].fitness );
	}

	// Expose the initial population so we can reference it elsewhere
	// Be sure to randomize the array since it was given to us ordered and we value "natural" election
	population = shuffle( initial );

	// Find two high-quality parents at random
	var father = random_parent(),
		mother = random_parent(),
		target = father.targetText;

	// Create a mutation via crossover
	if ( Math.random() < probabilities.cross_over ) {
		var cross_over = Math.floor( Math.random() * father.text.length ) + 1;
		children.push( new Shakespeare.Genome( father.text.substring( 0, cross_over ) + mother.text.substring( cross_over ), target ) );
		children.push( new Shakespeare.Genome( mother.text.substring( 0, cross_over ) + father.text.substring( cross_over ), target ) );
	} else {
		children.push( father );
		children.push( mother );
	}

	// Potentially mutate the children
	if ( Math.random() < probabilities.mutation ) {
		children[ 0 ] = mutate( children[ 0 ] );
	}
	if ( Math.random() < probabilities.mutation ) {
		children[ 1 ] = mutate( children[ 1 ] );
	}

	// Return the children
	return children;
}

/**
 * Select a parent at random from our initial population.
 *
 * @returns {Shakespeare.Genome}
 */
function random_parent() {
	// Initialize a random starting point
	var val = Math.random() * sumOfMaxMinusFitness;
	for ( var i = 0, l = population.length; i < l; i ++ ) {
		var maxMinusFitness = maxFitness - population[i].fitness;
		// If our test value is less than our element's fitness, then it's fit enough
		if ( val < maxMinusFitness ) {
			return population[i];
		}

		// Reduce our test value so we can be less picky about our random parent
		val -= maxMinusFitness;
	}

	// If we've iterated through all in our population, then we can't possibly find a parent
	throw 'Not to be, apparently.';
}

/**
 * Mutate a child genome.
 *
 * @param {Shakespeare.Genome} child
 * @returns {Shakespeare.Genome}
 */
function mutate( child ) {
	var text = child.text;

	text[ Math.floor( Math.random() * text.length ) ] = _validChars[ Math.floor( Math.random() * _validChars.length ) ];
	child.text = text;

	return child;
}

/**
 * Take a static array and shuffle things around a bit.
 *
 * @param {Array} array
 * @returns {Array}
 */
function shuffle( array ) {
	var counter = array.length, temp, index;

	// While there are elements in the array
	while ( counter > 0 ) {
		// Pick a random index
		index = Math.floor( Math.random() * counter );

		// Decrease counter by 1
		counter --;

		// And swap the last element with it
		temp = array[counter];
		array[counter] = array[index];
		array[index] = temp;
	}

	return array;
}