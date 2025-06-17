
Lab.View.Filters.content.bylineZone = function (viewModel) {

    var width = [];
    if(viewModel.get('fields.width_json.small')){
        width.push('small-'+viewModel.get('fields.width_json.small'));
    } else {
        width.push('small-12');
    }

    if(viewModel.get('fields.width_json.medium')){
        width.push('medium-'+viewModel.get('fields.width_json.medium'));
    } else {
        width.push('medium-10');
    }

    if(viewModel.get('fields.width_json.large')){
        width.push('large-'+viewModel.get('fields.width_json.large'));
    } else {
        width.push('large-8');
    }

    viewModel.setFiltered('width', width.join(' '));

    var align = [];
    if(viewModel.get('fields.bylineAlign_json.small')){
        align.push( viewModel.get('fields.bylineAlign_json.small') );
    } else {
        align.push( '' );
    }

    if(viewModel.get('fields.bylineAlign_json.medium')){
        align.push( viewModel.get('fields.bylineAlign_json.medium') );
    } else {
        align.push( 'medium-centered' );
    }

    if(viewModel.get('fields.bylineAlign_json.large')){
        align.push( viewModel.get('fields.bylineAlign_json.large') );
    } else {
        align.push( 'large-left' );
    }

    viewModel.setFiltered('bylineAlign', align.join(' '));


    var textAlign = 'text-left';
    if(viewModel.get('fields.textAlign')){
        textAlign = viewModel.get('fields.textAlign');
    }
    viewModel.setFiltered('bylineTextAlign', textAlign);

    viewModel.setFiltered('isChecked', function(){
        return function(text, render){
            text = text.split('|');
            if(viewModel.get(text[0]) == text[1]){
                return 'checked';
            }
        };
    });
};
