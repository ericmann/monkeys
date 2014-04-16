( function( windows, $, undefined ) {
	var document = window.document;

	/**
	 * Build a ZooKeeper task runner.
	 *
	 * @returns {{populate: populate, run: run, cleanup: cleanup}}
	 * @constructor
	 */
	function ZooKeeper() {
		var _workers = [],
			_generation = 0,
			_rate = 0,
			_start = 0,
			_population = [],
			_population_number = 0,
			_validChars = [];

		// Initialize valid characters
		_validChars[0] = String.fromCharCode( 10 );
		_validChars[1] = String.fromCharCode( 13 );
		for ( var i = 2, pos = 32; i < 97; i++, pos++ ) {
			_validChars[ i ] = String.fromCharCode( pos );
		}

		/**
		 * Create a random population.
		 *
		 * @param {String} text
		 * @param {Number} count
		 */
		function populate( text, count ) {
			if ( undefined === count ) {
				count = 1000;
			}

			_population_number = count;

			// Create a random generation of monkeys over which we'll iterate
			for ( var i = 0; i < count; i ++ ) {
				var member = createRandomGenome( text );
				_population.push( member );
			}
		}

		/**
		 * Actually iterate across the population, using a web worker to manage the loops and binding .promise
		 * callbacks to notify the UI.
		 *
		 * @returns {$.Deferred}
		 */
		function run() {
			var deferred = $.Deferred();

			// Set up our start time
			_start = Math.floor( Date.now() / 1000 );

			// Set up workers if they don't exist
			if ( _workers.length === 0 ) {
				for ( var i = 0; i < 3; i++ ) {
					_workers.push( new Worker( 'assets/scripts/worker.js' ) );
				}
			}

			// Start running steps
			_next( deferred );

			// Return a promise so we can bind events
			return deferred.promise()
		}

		/**
		 * Run the next step
		 *
		 * @param {$.Deferred} deferred
		 */
		function _next( deferred ) {
			// Run a step and wait until it's complete.
			_step().done( function( best ) {
				if ( 0 === best.fitness ) {
					deferred.resolveWith( { 'generation': _generation, 'generation_rate': _rate, 'best': best.text } );
				} else {
					deferred.notifyWith( { 'generation': _generation, 'generation_rate': _rate, 'best': best.text } );

					// Iterate
					_generation += 1;
					_rate = _generation / Math.max( 1, Math.floor( Date.now() / 1000 ) - _start );
					_next( deferred );
				}
			} );
		}

		/**
		 * Perform an iteration (replace the _population with a procedurally-generated one.
		 */
		function _step() {
			var deferred = $.Deferred(),
				promises = [],
				initial = _front_runners(),
				_descendants = [];

			for ( var i = 0, l = _workers.length; i < l; i++ ) {
				var worker_promise = $.Deferred();

				// Set the worker's onmessage handler manually to prevent any overlap
				_workers[ i ].onmessage = ( function( worker, promise, initial ) {
					return function( event ) {
						var data = window.JSON.parse( event.data );

						// Combine our arrays to make sure the the new population is built up out of generated children
						_descendants = _descendants.concat( data.children );

						if ( _descendants.length >= _population.length ) {
							promise.resolve();
						} else {
							worker.postMessage( window.JSON.stringify( { 'method': 'spawn', 'parents': initial, 'target': _population[0].targetText } ) );
						}
					}
				} )( _workers[i], worker_promise, initial );

				// Kick off an initial iteration for the worker.
				_workers[ i ].postMessage( JSON.stringify( { 'method': 'spawn', 'parents': initial, 'target': _population[0].targetText } ) );

				promises.push( worker_promise.promise() );
			}

			// After the workers have all completed their tasks, complete the step itself
			$.when.apply( $, promises ).then( function() {
				_descendants.sort( _genome_comparator );
				_descendants = _descendants.slice( 0, _population_number );

				// Update the population to be the descendant generation
				_population = _descendants;

				// Resolve our step with the best child out of the descendant array
				deferred.resolve( _descendants.shift() );
			} );

			// Return a promise so we can bind event handlers
			return deferred.promise();
		}

		/**
		 * Select just the top 10% of the population for breeding.
		 *
		 * @private
		 *
		 * @return {Array}
		 */
		function _front_runners() {
			var length = Math.ceil( _population.length / 10 );

			return _population.slice( 0, length );
		}

		/**
		 * Compare two Shakespeare.Genome objects to allow for ordering.
		 *
		 * @param {Shakespeare.Genome} a
		 * @param {Shakespeare.Genome} b
		 * @private
		 */
		function _genome_comparator( a, b ) {
			if ( a.fitness < b.fitness ) {        // A is fitter than B
				return -1;
			} else if ( a.fitness > b.fitness ) { // B is fitter than A
				return 1;
			} else {                              // A and B are equal
				return 0;
			}
		}

		/**
		 * Clear the task runner in its entirety.
		 */
		function cleanup() {
			// Instruct our workers to exit
			for ( var i = 0, l = workers.length; i < l; i++ ) {
				workers[ i ].postMessage( JSON.stringify( { 'method': 'cleanup' } ) );
			}

			// Reset the population
			workers = [];
			_population = [];
			_descendants = [];
			_generation = 0;
			_rate = 0;
			_start = 0;
		}

		/**
		 * Create a random genome so we can keep processing.
		 *
		 * @param {String} targetText
		 *
		 * @return {Shakespeare.Genome}
		 */
		function createRandomGenome( targetText ) {
			var genome = '';

			for( var i = 0, l = targetText.length; i < l; i++ ) {
				genome += _validChars[ Math.floor( Math.random() * _validChars.length ) ];
			}

			return new Shakespeare.Genome( genome, targetText );
		}

		/**
		 * Expose our public methods
		 */
		return {
			populate: populate,
			run: run,
			cleanup: cleanup
		};
	}

	window.Shakespeare = window.Shakespeare || {};
	window.Shakespeare.ZooKeeper = ZooKeeper;
} )(this, jQuery );