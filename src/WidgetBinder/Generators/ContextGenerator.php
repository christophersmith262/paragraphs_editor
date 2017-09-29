<?php

namespace Drupal\paragraphs_editor\WidgetBinder\Generators;

use Drupal\Core\Field\EntityReferenceFieldItemListInterface;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface;
use Drupal\paragraphs_editor\WidgetBinder\GeneratorBase;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState;

/**
 * Regenerates editor contexts for the editables inside an edit buffer item.
 *
 * Some paragraphs may contain nested inline editables. This generator creates
 * the editing context for each nested editable, and maps old contexts that have
 * been regenerated to their new context id so that existing edits aren't lost.
 */
class ContextGenerator extends GeneratorBase {

  /**
   * The context factory for generating contexts.
   *
   * @var \Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface
   */
  protected $contextFactory;

  /**
   * Creates a ContextGenerator object.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface $context_factory
   *   The context factory for generating contexts.
   */
  public function __construct(CommandContextFactoryInterface $context_factory) {
    $this->contextFactory = $context_factory;
  }

  /**
   * {@inheritdoc}
   */
  public function id() {
    return 'context';
  }

  /**
   * {@inheritdoc}
   */
  public function initialize(WidgetBinderData $data, WidgetBinderDataCompilerState $state, ParagraphInterface $root_paragraph) {
    $editable_contexts = $state->getItemContext()->getAdditionalContext('editableContexts');
    $state->set('regenerate_contexts', $editable_contexts);
  }

  /**
   * {@inheritdoc}
   */
  public function processField(WidgetBinderData $data, WidgetBinderDataCompilerState $state, EntityReferenceFieldItemListInterface $items, $is_editor_field) {
    if ($is_editor_field) {
      $regenerate_contexts = $state->get('regenerate_contexts');

      // We regenerate the context each time the field item is rendered to
      // prevent issues with form caching. This means we have to map existing
      // edits fro mthe old context to the new one.
      $entity = $items->getEntity();
      $uuid = $entity->uuid();
      $field_config_id = $items->getFieldDefinition()->id();
      if (!empty($regenerate_contexts[$uuid][$field_config_id])) {
        $from_context = $this->contextFactory->get($regenerate_contexts[$uuid][$field_config_id]);
        $context = $this->contextFactory->regenerate($from_context);
        $data->addModel('context', $from_context->getContextString(), [
          'id' => $context->getContextString(),
          'ownerId' => $uuid,
          'fieldId' => $field_config_id,
        ]);
      }
      else {
        $context = $this->contextFactory->create($field_config_id, $entity->id());
        $data->addModel('context', $context->getContextString(), [
          'id' => $context->getContextString(),
          'ownerId' => $uuid,
          'fieldId' => $field_config_id,
          'schemaId' => $field_config_id,
        ]);
      }
    }
  }

  /**
   * A public interface to get context objects from context ids.
   *
   * @return \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface
   *   The requested context, or NULL if it could not be found.
   */
  public function getContext($context_id) {
    return $this->contextFactory->get($context_id);
  }

}
