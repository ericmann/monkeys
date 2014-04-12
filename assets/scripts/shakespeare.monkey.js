/**
 * Define the wrapper for a web worker.
 *
 * The Monkey class is exposed as the window.Shakespeare.Monkey object.
 *
 * @since 1.0
 */
( function( window, $, undefined ) {

	/**
	 * Web worker wrapper.
	 *
	 * @param {string} script Source of the worker.
	 *
	 * @constructor
	 */
	function Monkey( script ) {
		var SELF = this,
			monkey = new window.Worker( script ),
			working = false,
			deferred = false;

		/**
		 * Allow for fetching an availability flag from instantiated objects.
		 */
		SELF.__defineGetter__( 'available', function() {
			return ! working;
		} );

		/**
		 * Send a message to the embedded web worker.
		 *
		 * @param {object} data Data array to pass to the worker. Must include a `job` element to identify the task.
		 */
		SELF.postMessage = function postMessage( data ) {
			deferred = $.Deferred();

			// Lock the worker
			working = true;

			/**
			 * Set up the callback to handle when the web worker finishes its processing.
			 *
			 * @param {Event} e
			 */
			worker.onmessage = function( e ) {
				var data = JSON.parse( e.data ),
					payload = data.payload;

				// Unlock the worker
				working = false;

				// Resolve our deferred object so listeners can process
				deferred.resolve( [ payload ] );

				// Clear the deferred so we can keep processing
				deferred = false;
			};

			// Send our instructions to the web worker.
			worker.postMessage( JSON.stringify( data ) );

			// Return a promise object so we can bind asynchronous callbacks.
			return deferred.promise();
		};

		/**
		 * Terminate the worker.
		 */
		SELF.terminate = function() {
			// Kill the worker
			worker.terminate();
			worker = undefined;

			// Unlock the worker
			working = false;

			// Reject the promise
			if ( false !== deferred ) {
				deferred.reject();
				deferred = false;
			}
		};
	}

	window.Shakespeare = window.Shakespeare || {};
	window.Shakespeare.Monkey = Monkey;
} )( window, jQuery );