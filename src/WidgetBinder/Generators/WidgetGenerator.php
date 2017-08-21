<?php

namespace Drupal\paragraphs_editor\WidgetBinder\Generators;

use Drupal\Core\Render\RenderContext;
use Drupal\paragraphs_editor\WidgetBinder\GeneratorBase;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState;

/**
 * Generates widget models for updating widget properties in the editor.
 *
 * For most operations the widget doesn't need to be directly altered from an
 * explicit server-side update.
 *
 * The lone exception is for duplication requests. When an edit buffer item is
 * duplicated, we need to instruct the widget that it should no longer be in a
 * duplicating state, and we need to map edits from the original widget to the
 * copy.
 */
class WidgetGenerator extends GeneratorBase {

  /**
   * {@inheritdoc}
   */
  public function id() {
    return 'widget';
  }

  /**
   * {@inheritdoc}
   */
  public function complete(WidgetBinderData $data, WidgetBinderDataCompilerState $state, RenderContext $render_context, $markup) {
    $context = $state->getItemContext();
    $widget_id = $context->getAdditionalContext('widgetId');
    if ($widget_id) {
      $new_edits = [];
      $old_edits = $context->getAdditionalContext('edits');
      $contexts = $context->getAdditionalContext('editableContexts');
      $entity_map = $context->getAdditionalContext('entityMap');
      foreach ($contexts as $uuid => $fields) {
        foreach ($fields as $field_name => $old_context_id) {
          $new_context_id = $data->getContextId($entity_map[$uuid], $field_name);
          if (!empty($old_edits[$old_context_id])) {
            $new_edits[$new_context_id] = $old_edits[$old_context_id];
          }
        }
      }

      $data->addModel('widget', $widget_id, [
        'contextId' => $context->getContextString(),
        'editorContextId' => $context->getAdditionalContext('editorContext'),
        'itemContextId' => $context->getContextString(),
        'itemId' => $state->getItem()->getEntity()->uuid(),
        'duplicating' => FALSE,
        'edits' => $new_edits,
      ]);
    }
  }

}
