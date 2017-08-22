<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\semantic_analyzer;

use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\Plugin\dom_processor\SemanticAnalyzerInterface;
use Drupal\paragraphs_editor\Plugin\dom_processor\ParagraphsEditorDomProcessorPluginTrait;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * @DomProcessorSemanticAnalyzer(
 *   id = "paragraphs_editor_paragraph_analyzer",
 *   label = "Paragraphs Editor Paragraph Analyzer"
 * )
 */
class ParagraphsEditorParagraphAnalyzer implements SemanticAnalyzerInterface, ContainerFactoryPluginInterface {
  use ParagraphsEditorDomProcessorPluginTrait;

  protected $storage;
  protected $contextFactory;

  /**
   *
   */
  public function __construct($field_value_manager, $storage, $context_factory) {
    $this->initializeParagraphsEditorDomProcessorPlugin($field_value_manager);
    $this->storage = $storage;
    $this->contextFactory = $context_factory;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->get('paragraphs_editor.field_value.manager'),
      $container->get('entity_type.manager')->getStorage('paragraph'),
      $container->get('paragraphs_editor.command.context_factory')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function analyze(SemanticDataInterface $data) {
    if ($this->is($data, 'widget')) {
      return $this->analyzeWidget($data);
    }
    elseif ($this->is($data, 'field')) {
      return $this->analyzeField($data);
    }
    else {
      return $data;
    }
  }

  /**
   *
   */
  protected function analyzeWidget(SemanticDataInterface $data) {
    $entity = NULL;

    $uuid = $this->getAttribute($data->node(), 'widget', '<uuid>');
    if (!$uuid) {
      throw new DomProcessorError("Reference to empty UUID discarded.");
    }

    $context_id = $this->getAttribute($data->node(), 'widget', '<context>');
    if (!$context_id) {
      $context_id = $data->get('field.context_id');
    }

    // If there is a context id, try to load the entity from the edit buffer.
    if ($context_id) {
      try {
        $context = $this->contextFactory->get($context_id);
        $edit_buffer = $context->getEditBuffer();
        $item = $edit_buffer->getItem($uuid);
        if ($item) {
          $entity = $item->getEntity();
          $entity->setNeedsSave(TRUE);
        }
      }
      catch (\Exception $e) {
        throw new DomProcessorError("Could not load entity from context.");
      }
    }

    // If there is a field, try to load the entity revision from the field.
    if (!$entity && $data->has('field.items')) {
      foreach ($this->fieldValueManager->getReferencedEntities($data->get('field.items')) as $entity) {
        if ($entity->uuid() == $uuid) {
          break;
        }
      }
    }

    // Otherwise try to laod the entity from the database.
    if (!$entity) {
      $matches = $this->storage->loadByProperties([
        'uuid' => $uuid,
      ]);
      if ($matches) {
        $entity = reset($matches);
      }
    }

    // Fail if we couldn't load the entity from anywhere.
    if (!$entity) {
      throw new DomProcessorError("Could not load entity.");
    }

    return $data->tag('paragraph', [
      'entity' => $entity,
      'context_id' => $context_id,
    ]);
  }

  /**
   *
   */
  protected function analyzeField(SemanticDataInterface $data) {
    $field_name = $this->getAttribute($data->node(), 'field', '<name>');
    $is_mutable = filter_var($this->getAttribute($data->node(), 'field', '<editable>'), FILTER_VALIDATE_BOOLEAN);
    $context_id = $this->getAttribute($data->node(), 'field', '<context>');

    if (!$field_name) {
      throw new DomProcessorError("Field name missing.");
    }

    if (!$data->has('paragraph.entity')) {
      throw new DomProcessorError("Cannot access field value without an entity.");
    }

    $paragraph = $data->get('paragraph.entity');
    if (!isset($paragraph->{$field_name})) {
      throw new DomProcessorError("Could not access field on entity.");
    }

    $items = $paragraph->{$field_name};
    $field_definition = $items->getFieldDefinition();
    if (!$this->fieldValueManager->isParagraphsField($field_definition)) {
      throw new DomProcessorError("Attempted to access non-paragraphs field.");
    }

    if ($is_mutable && !$this->fieldValueManager->isParagraphsEditorField($field_definition)) {
      throw new DomProcessorError("Edits defined for a non-editable field.");
    }

    $field_value_wrapper = $is_mutable ? $this->fieldValueManager->wrapItems($items) : NULL;

    return $data->tag('field', [
      'items' => $items,
      'context_id' => $context_id,
      'is_mutable' => $is_mutable,
      'wrapper' => $field_value_wrapper,
    ]);
  }

}
