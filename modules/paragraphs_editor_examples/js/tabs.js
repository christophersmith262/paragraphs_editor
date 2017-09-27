
(function(Drupal, $) {

  Drupal.behaviors.paragraphs_editor_examples_tabs = {
    attach: function(context) {
      $('.paragraph--type--tabs', context).tabs();
    },
  };

})(Drupal, jQuery);
