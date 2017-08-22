<?php

namespace Drupal\paragraphs_editor\WidgetBinder\Generators;

use Drupal\Core\Field\EntityReferenceFieldItemListInterface;
use Drupal\Core\Render\RenderContext;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\paragraphs_editor\WidgetBinder\GeneratorBase;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState;

/**
 * Generates edit buffer item models for the widget binder library.
 *
 * The edit buffer item model contains the markup and information about editable
 * child fields.
 */
class ItemGenerator extends GeneratorBase {

  /**
   * {@inheritdoc}
   */
  public function id() {
    return 'item';
  }

  /**
   * {@inheritdoc}
   */
  public function initialize(WidgetBinderData $data, WidgetBinderDataCompilerState $state, ParagraphInterface $root_paragraph) {
    $state->set('field_map', []);
    $state->set('field_map_stack', []);
  }

  /**
   * {@inheritdoc}
   */
  public function processParagraph(WidgetBinderData $data, WidgetBinderDataCompilerState $state, ParagraphInterface $paragraph) {
    $top = $this->topPath($state);
    if ($top) {
      $this->pushPath($state, [
        'type' => 'widget',
        'uuid' => $paragraph->uuid(),
      ]);
      $this->savePath($state);
    }
  }

  /**
   * {@inheritdoc}
   */
  public function postprocessParagraph(WidgetBinderData $data, WidgetBinderDataCompilerState $state, ParagraphInterface $paragraph) {
    $this->popPath($state);
  }

  /**
   * {@inheritdoc}
   */
  public function processField(WidgetBinderData $data, WidgetBinderDataCompilerState $state, EntityReferenceFieldItemListInterface $items, $is_editor_field) {
    $paragraph = $items->getEntity();
    $field_definition = $items->getFieldDefinition();
    $path = [
      'type' => 'field',
      'name' => $field_definition->getName(),
    ];

    $context_id = $data->getContextId($items->getEntity()->uuid(), $field_definition->id());
    if ($context_id) {
      $path['context'] = $context_id;
    }

    $this->pushPath($state, $path);
    if ($is_editor_field) {
      $this->savePath($state);
    }
  }

  /**
   * {@inheritdoc}
   */
  public function postprocessField(WidgetBinderData $data, WidgetBinderDataCompilerState $state, EntityReferenceFieldItemListInterface $items, $is_editor_field) {
    $this->popPath($state);
  }

  /**
   * {@inheritdoc}
   */
  public function complete(WidgetBinderData $data, WidgetBinderDataCompilerState $state, RenderContext $render_context, $markup) {
    $context = $state->getItemContext();
    $paragraph = $state->getItem()->getEntity();

    $item_model = [
      'contextId' => $context->getContextString(),
      'markup' => $markup,
      'type' => $paragraph->bundle(),
      'fields' => $state->get('field_map'),
    ];
    if ($context->getAdditionalContext('command') == 'insert') {
      $item_model['insert'] = 'true';
    }

    $data->addModel('editBufferItem', $paragraph->uuid(), $item_model);
  }

  /**
   * Pushes a path node to the top of the map stack.
   *
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState $state
   *   The current compiler state.
   * @param array $data
   *   The path node to push.
   */
  protected function pushPath(WidgetBinderDataCompilerState $state, array $data) {
    $stack = $state->get('field_map_stack');
    $stack[] = $data;
    $state->set('field_map_stack', $stack);
  }

  /**
   * Gets the path node at the top of the stack.
   *
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState $state
   *   The current compiler state.
   *
   * @return array
   *   The top path node or NULL if no node exists.
   */
  protected function topPath(WidgetBinderDataCompilerState $state) {
    $stack = $state->get('field_map_stack');
    return $stack ? end($stack) : NULL;
  }

  /**
   * Pops a path node off the top of the map stack.
   *
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState $state
   *   The current compiler state.
   *
   * @return array
   *   The popped path node or NULL if no node exists.
   */
  protected function popPath(WidgetBinderDataCompilerState $state) {
    $stack = $state->get('field_map_stack');
    $data = array_pop($stack);
    $state->set('field_map_stack', $stack);
    return $data;
  }

  /**
   * Saves a path to the compiled field map in the compiler state.
   *
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState $state
   *   The current compiler state.
   */
  protected function savePath(WidgetBinderDataCompilerState $state) {
    $node_path = $state->get('field_map_stack');
    $field_map = $state->get('field_map');

    $map = &$field_map;
    foreach ($node_path as $node) {

      if ($node['type'] == 'field') {
        $node_id = $node['name'];
      }
      else {
        $node_id = $node['uuid'];
      }

      if (!isset($map[$node_id])) {
        $map[$node_id] = $node;
      }
      else {
        $map[$node_id] += $node;
      }

      if (!isset($map[$node_id]['children'])) {
        $map[$node_id]['children'] = [];
      }

      $map = &$map[$node_id]['children'];
    }

    $state->set('field_map', $field_map);
  }

}
