var workers = []
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
		workers.push( new window.Worker( 'worker.js' ) );
	}
}

/**
 * Clean up our child worker threads
 */
function cleanup() {
	// Instruct our workers to exit
	for ( var i = 0, l = workers.length; i < l; i++ ) {
		workers[ i ].postMessage( window.JSON.stringify( { 'method': 'cleanup' } ) );
	}

	// Close out the worker.
	self.close();
}

/**
 * Actually run our task given an initial population.
 */
function run( initial, count ) {
	runNext( initial, count );
}

function runNext( initial, count ) {
	var promises = [];

	for( var i = 0, l = workers.length; i < l; i++ ) {
		promises.push( new Promise( function ( resolve, reject ) {
			var worker = workers[ i ];

			worker.onmessage = null;

			worker.postMessage( window.JSON.stringify( { 'method': 'spawn', 'parents': initial } ) );

			worker.onmessage = function ( event ) {
				var data = JSON.parse( event.data );

				resolve( data.children );
			}
		} ) );
	}

	Promise.all( promises ).then( function( values ) {
		for( var i = 0, l = values.length; i < l; i++ ) {
			var value = values[ i ];
			for ( var j = 0, k = value.length; j < k; j++ ) {
				new_population.push( value[ j ] );
			}
		}

		if ( new_population.length < count ) {
			runNext( initial );
		} else {
			window.postMessage( window.JSON.stringify( { 'descendants': new_population } ) );
		}
	} );
}