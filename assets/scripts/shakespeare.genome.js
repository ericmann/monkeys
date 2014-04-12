( function( window, undefined ) {
	/**
	 * Represent a single genome.
	 *
	 * @param {string} text
	 * @param {string} targetText
	 * @constructor
	 */
	function Genome( text, targetText) {
		var SELF = this,
			fitness;

		function recomputeFitness() {
			if ( null !== text && null !== targetText ) {
				var diffs = 0;
				for ( var i = 0, l = targetText.length; i < l; i++ ) {
					if ( targetText[i] !== text[i] ) {
						diffs += 1;
					}

					fitness = diffs;
				}
			} else {
				fitness = Number.MAX_VALUE;
			}
		}

		SELF.__defineGetter__( 'text', function() {
			return text;
		} );

		SELF.__defineSetter__( 'text', function( value ) {
			text = value;
			recomputeFitness();
		} );

		SELF.__defineGetter__( 'targetText', function() {
			return targetText;
		} );

		SELF.__defineSetter__( 'targetText', function( value ) {
			targetText = value;
			recomputeFitness();
		} );

		SELF.__defineGetter__( 'fitness', function() {
			return fitness;
		} );

		// Initialize fitness
		recomputeFitness();
	}

	window.Shakespeare = window.Shakespeare || {};
	window.Shakespeare.Genome = Genome;
} )( this );