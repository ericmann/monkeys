( function( window, $, undefined ) {
	var Monkey = window.Shakespeare.Monkey;

	/**
	 * Wrapper for worker objects.
	 *
	 * @constructor
	 */
	function Troop( script ) {
		var SELF = this,
			queue_running = false,
			monkeys = [],
			jobs = [];

		/**
		 * Process the queue until all jobs are complete.
		 *
		 * @returns {$.Deferred}
		 */
		function process() {
			var deferred = $.Deferred();

			/**
			 * Build a task runner that fetches a monkey and makes it dance.
			 *
			 * @param job
			 * @returns {$.Deferred}
			 */
			var task = function( job ) {
				var deferred_task = $.Deferred(),
					zoo_keeper = get_monkey();

				zoo_keeper.done( function( monkey ) {
					monkey.postMessage( job ).done( function() { deferred_task.resolve(); } );
				} );

				return deferred_task.promise();
			};

			// Wire up a task runner for every job registered in the queue.

			return deferred.promise();
		}

		/**
		 * Get the next available monkey.
		 *
		 * @returns {$.Deferred}
		 */
		function get_monkey() {
			var deferred = $.Deferred(),
				monkey = false;

			/**
			 * Loop through our worker threads and grab the first available monkey.
			 *
			 * If no monkeys are available, set a short timeout (1ms) and check again.
			 *
			 * @param {$.Deferred} d
			 */
			function resolver( d ) {
				for ( var i = 0, l = monkeys.length; i < l; i ++ ) {
					if ( monkeys[i].available ) {
						d.resolve( [ monkeys[i] ] );
						return;
					}
				}

				window.setTimeout( function() {
					resolver( d );
				}, 1 );
			}

			resolver( deferred );

			return deferred.promise();
		}

		/**
		 * Add a new job to the monkey's job queue.
		 *
		 * @param {object} job
		 */
		SELF.queue = function ( job ) {
			jobs.push( job );
		};

		/**
		 * Process all queued jobs. When complete, fire the passed-in callback.
		 *
		 * @returns {$.Deferred}
		 */
		SELF.run_queue = function () {
			if ( queue_running ) {
				throw 'Queue is already running!';
			}

			var deferred = $.Deferred(),
				task_runners = [];

			// Lock our queue
			queue_running = true;

			for ( var i = 0, l = monkeys.length; i < l; i++ ) {
				task_runners.push( process() );
			}

			// When all of our task runners are complete, resolve our deferred.
			$.when.apply( $, task_runners )
				.done( function() { queue_running = false; deferred.resolve(); } )
				.fail( function() { deferred.reject(); } );

			// Return a promise so we can wire up callbacks
			return deferred.promise();
		};

		/**
		 * Spawn a certain number of monkeys.
		 *
		 * @param {number} number
		 */
		SELF.spawn = function( number ) {
			number = number || 1;

			// First, kill all the monkeys!
			SELF.kill();

			for ( var i = 0; i < number; i++ ) {
				monkeys.push( new Monkey( script ) );
			}
		};

		/**
		 * Kill all the monkeys
		 */
		SELF.kill = function() {
			while( monkeys.length > 0 ) {
				var monkey = monkeys.pop();

				monkey.terminate();
			}
		}
	}

	window.Shakespeare = window.Shakespeare || {};
	window.Shakespeare.Troop = Troop;
} )( window, jQuery );