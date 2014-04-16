( function( windows, $, undefined ) {
	var document = window.document;

	/**
	 * Build a ZooKeeper task runner.
	 *
	 * @returns {{populate: populate, run: run, cleanup: cleanup}}
	 * @constructor
	 */
	function ZooKeeper() {
		var _runner,
			_generation = 0,
			_rate = 0,
			_start = 0,
			_population = [],
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

			// Create our task runner
			_runner = new window.Worker( 'assets/scripts/taskrunner.js' );

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
				if ( text === best ) {
					deferred.resolveWith( [ { 'generation': _generation, 'generation_rate': _rate, 'best': best } ] );
				} else {
					deferred.notifyWith( [ { 'generation': _generation, 'generation_rate': _rate, 'best': best } ] );

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
			var deferred = $.Deferred();

			// Clear existing message callbacks for the task runner
			_runner.onmessage = undefined;

			// Tell our task runner to perform a single run
			_runner.postMessage( window.JSON.stringify( { 'method': 'run', 'population': _front_runners(), 'count': _population.length } ) );

			// Set up a callback for our task runner
			_runner.onmessage = function( event ) {
				var data = window.JSON.parse( event.data );

				// Update the population to be the descendant generation
				_population = data.descendants;

				// Sort the descendants
				data.descendants.sort( _genome_comparator );

				// Resolve our step with the best child out of the descendant array
				deferred.resolve( [ data.descendants.shift() ] );
			};

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

			_population.sort( _genome_comparator );

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
			// Tell the task runner to clean things up
			_runner.postMessage( window.JSON.stringify( { method: 'cleanup' } ) );
			_runner = null;

			// Reset the population
			_population = [];
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