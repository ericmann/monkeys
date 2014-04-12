// Import scripts for managing the Genome object and calculating genetics matches
importScripts( 'shakespeare.genome.js', 'shakespeare.genetics.js' );

var Genetics,
	sumOfMaxMinusFitness,
	maxFitness,
	population,
	settings;

onmessage = function ( e ) {
	var data = JSON.parse( e.data );

	if ( undefined === data.job ) {
		postMessage( JSON.stringify( { error: 'Invalid job' } ) );
		return;
	}

	switch( data.job ) {
		case 'createChildren' :
			var twins = createChildren();

			var payload = {
				'task': 'createChildren',
				'payload': twins
			};

			postMessage( JSON.stringify( payload ) );
			break;
		case 'setData' :
			data = data.data;

			sumOfMaxMinusFitness = data.sum;
			maxFitness = data.maxFitness;
			population = data.population;

			settings = data.settings;

			Genetics = new Shakespeare.Genetics( settings.targetText, settings );
			break;
		default :
			postMessage( JSON.stringfy( { error: 'Invalid job' } ) );
	}
};

function createChildren() {
	var twins = Genetics.createChildren(
		Genetics.findRandomHighQualityParent( sumOfMaxMinusFitness, maxFitness, population ),
		Genetics.findRandomHighQualityParent( sumOfMaxMinusFitness, maxFitness, population ),
		settings
	);

	return twins;
}