/**
 * Main JavaScript file. Used to control UI and kick off data processing.
 *
 * @since 1.0
 */
( function( window, $, undefined ) {
	var document = window.document,
		Shakespeare = window.Shakespeare,
		$document = $( document ),

		// UI elements
		$target = $( document.getElementById( 'targettext' ) ),
		$current = $( document.getElementById( 'currenttext' ) ),
		$generation = $( document.getElementById( 'generation' ) ),
		$genpersec = $( document.getElementById( 'gps' ) ),
		$status = $( document.getElementById( 'status' ) ),
		$startbtn = $( document.getElementById( 'startbutton' ) ),
		$cancelbtn = $( document.getElementById( 'cancelbutton' ) ),

		// Initial target text that our monkeys will attempt to type
		shakespeare = 'To be or not to be, that is the question;\n'
			+ 'Whether \'tis nobler in the mind to suffer\n'
			+ 'The slings and arrows of outrageous fortune,\n'
			+ 'Or to take arms against a sea of troubles,\n'
			+ 'And by opposing, end them.',

		// Variables used by the iterative processor
		queue = null,
		runner = null;

	/**
	 * Update the UI with the current process of the operation.
	 *
	 * @param {string} text Current best attempt
	 * @param {number} gen  Which generation are we on?
	 * @param {number} gps  How efficient is the processor?
	 */
	function updateProgress( text, gen, gps ) {
		$current.val( text );
		$generation.text( gen );
		$genpersec.text( gps );
	}

	/**
	 * Don't just sit there, get things started.
	 *
	 * @param {string} text
	 */
	function startTyping( text ) {
		// Clear out any existing data
		updateProgress( '', 0, 0 );

		// Swap button states
		$cancelbtn.removeAttr( 'disabled' );
		$startbtn.attr( 'disabled', 'disabled' );

		// Instantiate the task runner and populate it with an initial set of 200
		runner = new Shakespeare.ZooKeeper();
		runner.populate( text, 1000 );

		// Display the status
		$status.text( 'Working...' );
		$target.val( text );

		// Start running the task
		queue = runner.run();

		// Update progress
		queue.progress( function() {
			updateProgress( this.best, this.generation, this.generation_rate );
		} );

		// On complete
		queue.done( function( data ) {
			updateProgress( data.best, data.generation, data.generation_rate );
			stopTyping();
		} );
	}

	/**
	 * Halt all operations and clean up what's been running thus far.
	 */
	function stopTyping() {
		// Swap button states
		$startbtn.removeAttr( 'disabled' );
		$cancelbtn.attr( 'disabled', 'disabled' );
	}

	// Set the value of our "target" textbox to the be Shakespeare quote above.
	$target.val( shakespeare );

	// Wire up start button click events
	$startbtn.on( 'click', function( event ) {
		$status.text( 'Queued ...' );
		startTyping( $target.val() );
	} );

	// Wire up cancel button click events.
	$cancelbtn.on( 'click', function( event ) {
		$status.text( 'Cancelled ...' );

		runner.cleanup();
		runner = null;
		queue = null;

		stopTyping();
	} );
} )( window, jQuery );