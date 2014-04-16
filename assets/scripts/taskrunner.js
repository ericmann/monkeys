var workers = [],
	new_population = [];

onmessage = function( event ) {
	var data = JSON.parse( event.data );

	switch( data.method ) {
		case 'cleanup':
			cleanup();
			break;
		case 'run':
			// If we don't have any workers, create some.
			if ( workers.length === 0 ) {
				initialize();
			}

			// Actually run the task
			run( data.population, data.count );
			break;
	}
};

/**
 * Set up our child processes
 */
function initialize() {
	for ( var i = 0; i < 3; i++ ) {
		workers.push( new Worker( 'worker.js' ) );
	}
}

/**
 * Clean up our child worker threads
 */
function cleanup() {
	// Instruct our workers to exit
	for ( var i = 0, l = workers.length; i < l; i++ ) {
		workers[ i ].postMessage( JSON.stringify( { 'method': 'cleanup' } ) );
	}

	// Close out the worker.
	self.close();
}

/**
 * Actually run our task given an initial population.
 */
function run( initial, count ) {
	var promises = [];

	for ( var i = 0, l = workers.length; i < l; i++ ) {
		// Build a primitive promise object to wrap our worker.  Each worker will keep iteratively calling itself until
		// we've built up a new population the same size (or larger) as the requested one.
		var promise = (function( worker ) {
			return new Promise( function( resolve, reject ) {
				// Set the worker's onmessage handler manually to prevent any overlap
				worker.onmessage = function( event ) {
					var data = JSON.parse( event.data );

					// Combine our arrays to make sure the the new population is built up out of generated children
					new_population = new_population.concat( data.children );

					if ( new_population.length >= count ) {
						// If we've built a sufficient population, then resolve the worker's promise
						resolve();
					} else {
						// If we still need children, then iterate again.
						worker.postMessage( JSON.stringify( { 'method': 'spawn', 'parents': initial } ) );
					}
				};

				// Kick off an initial iteration for the worker.
				worker.postMessage( JSON.stringify( { 'method': 'spawn', 'parents': initial } ) );
			} );
		} )( workers[i] );

		// Collect all of our promises together
		promises.push( promise );
	}

	// When all of our worker promises complete, we want to return our new population to the parent container.
	Promise.all( promises ).then( function() {
		var population = new_population.slice( 0, count );
		postMessage( JSON.stringify( { 'descendants': population } ) );
	} );
}