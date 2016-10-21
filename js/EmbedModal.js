
(function ($) {
  var lastModal = false;

  Drupal.ParagraphsExtra = Drupal.ParagraphsExtra || {};
  Drupal.ParagraphsExtra.Api = Drupal.ParagraphsExtra.Api || {};

  Drupal.ParagraphsExtra.Api.ParagraphsCkeditorEmbedModal = {

    init: function(plugin) {
      plugin.listener = new Drupal.ParagraphsExtra.Api.EventListener({
        embed_form_completed: 'onEmbedFormComplete',
      });
    },

    setActivePlugin: function(plugin) {
      this.listener.plugins.values[0] = plugin;
    },

    triggerActivePlugin: function(serialized_results) {
      var results = $.parseJSON(serialized_results);
      this.listener.trigger(this, 'embed_form_completed', results.form_id, results.rendered);
    },

    show: function(bundle, form_entity_id) {
      var $trigger = Drupal.ParagraphsExtra.lookup('ckeditor', 'modal-trigger');
      var $build_id = $trigger.closest('form').find('input[name="form_build_id"]');

      if ($build_id) {
        var form_build_id = $build_id.attr('value');
        var link = '/admin/paragraphs-ckeditor/nojs/embed-form/' + form_build_id;

        if (bundle) {
          link += '/' + bundle;
        }
        else {
          link += '/' + 'text';
        }

        if (form_entity_id) {
          link += '/' + form_entity_id;
        }
        else {
          link += '/text';
        }

        $trigger.unbind()
          .click(Drupal.CTools.Modal.clickAjaxLink)
          .attr('href', link);

        var e = {
          url: link,
          event: 'click',
          progress: {
            type: 'throbber'
          }
        }

        Drupal.ajax[link] = new Drupal.ajax(link, $trigger.get(), e);

        $trigger.click();
      }
    }
  };

  Drupal.behaviors.ParagraphsCkeditorEmbedModal = {
    attach: function (context, settings) {
      // @todo After https://www.drupal.org/node/2264187 is fixed we can remove
      // this.
      if ($(context).attr('id') == 'modalContent') {
        $('#paragraphs-ckeditor-paragraphs-embed-form', context).each(function() {
          $('.ctools-modal-media-file-edit').each(function() {
            var link = $(this).attr('href');
            $(this).hide();
          });
        });
      };
      $('body', context).bind('paragraphs_ckeditor_embed_sent', function (e, serialized_results) {
        Drupal.ParagraphsExtra.Api.ParagraphsCkeditorEmbedModal.triggerActivePlugin(serialized_results);
      })
    }
  };

}(jQuery));
