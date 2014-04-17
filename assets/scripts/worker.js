// Import scripts for managing the Genome object and calculating genetics matches
importScripts( 'shakespeare.genome.js' );

var probabilities = {
		cross_over: 0.80,
		mutation:   0.25
	},
	population = [],
	maxFitness = 0,
	sumOfMaxMinusFitness = 0;

onmessage = function ( event ) {
	var data = JSON.parse( event.data );

	switch ( data.method ) {
		case 'cleanup':
			// Close out the worker
			self.close();
			break;
		case 'spawn':
			// Collect our children
			var children = create_children( data.parents, data.target );

			// Send our children back to the task runner
			postMessage( JSON.stringify( { 'children': children } ) );
			break;
	}
};

/**
 * Create a pair of child strings given an initial array of high-fitness candidates.
 *
 * @param {Array}  initial
 * @param {String} target
 */
function create_children( initial, target ) {
	var children = [];

	for ( i = 0, l = initial.length; i < l; i ++ ) {
		maxFitness = Math.max( maxFitness, initial[i].fitness );
	}
	maxFitness += 1;

	for ( i = 0, l = initial.length; i < l; i ++ ) {
		sumOfMaxMinusFitness += ( maxFitness - initial[i].fitness );
	}

	// Expose the initial population so we can reference it elsewhere
	// Be sure to randomize the array since it was given to us ordered and we value "natural" election
	population = shuffle( initial );
	population = initial;

	// Find two high-quality parents at random
	var father = random_parent(),
		mother = random_parent();

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
	var random_index = Math.floor( Math.random() * population.length );

	return population[ random_index ];
}

/**
 * Mutate a child genome.
 *
 * @param {Shakespeare.Genome} child
 * @returns {Shakespeare.Genome}
 */
function mutate( child ) {
	var text = child.text,
		index = Math.floor( Math.random() * text.length ),
		upOrDown = Math.random() <= 0.5 ? - 1 : 1,
		newChar = String.fromCharCode( text.charCodeAt( index ) + upOrDown ),
		newString = '';

	for ( i = 0; i < text.length; i ++ ) {
		if ( i == index ) {
			newString += newChar;
		}
		else {
			newString += text[i];
		}
	}

	child.text = newString;

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