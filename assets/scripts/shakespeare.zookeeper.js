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
			_generation = 1,
			_rate = 0,
			_start = 0,
			_population = [],
			_population_number = 0;

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
				_population.push( createRandomGenome( text ) );
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

			// Set up our initial environment
			_generation = 1;
			_rate = 0;
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
				if ( undefined === best ) {
					deferred.reject();
					return;
				}

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
		 * Select just the top half of the population for breeding.
		 *
		 * @private
		 *
		 * @return {Array}
		 */
		function _front_runners() {
			_population.sort( _genome_comparator );

			return _population.slice( 0, ( Math.ceil( _population.length / 2 ) ) );
		}

		/**
		 * Compare two Shakespeare.Genome objects to allow for ordering.
		 *
		 * @param {Shakespeare.Genome} a
		 * @param {Shakespeare.Genome} b
		 * @private
		 */
		function _genome_comparator( a, b ) {
			return a.fitness - b.fitness;
		}

		/**
		 * Clear the task runner in its entirety.
		 */
		function cleanup() {
			// Instruct our workers to exit
			for ( var i = 0, l = _workers.length; i < l; i++ ) {
				_workers[ i ].postMessage( JSON.stringify( { 'method': 'cleanup' } ) );
			}

			// Reset the population
			_workers = [];
			_population = [];
		}

		/**
		 * Create a random genome so we can keep processing.
		 *
		 * @param {String} targetText
		 *
		 * @return {window.Shakespeare.Genome}
		 */
		function createRandomGenome( targetText ) {
			var genome = '',
				length = targetText.length;

			while( length-- ) {
				genome += String.fromCharCode( Math.floor( Math.random() * 255 ) );
			}

			return new window.Shakespeare.Genome( genome, targetText );
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

	window.Shakespeare.ZooKeeper = ZooKeeper;
} )(this, jQuery );