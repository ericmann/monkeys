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

			do {
				var monkey;

				if ( false === ( monkey = get_monkey() ) ) {
					continue;
				}

				// Come monkey, it's time to dance!
				monkey.postMessage( jobs.pop() );
			} while( jobs.length > 0 );

			return deferred.promise();
		}

		/**
		 * Get the next available monkey.
		 *
		 * @returns {Monkey|bool} False if no monkeys available.
		 */
		function get_monkey() {
			for ( var i = 0, l = monkeys.length; i < l; i ++ ) {
				if ( monkeys[i].available ) {
					return monkeys[i];
				}
			}

			return false;
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