<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\semantic_analyzer;

use Drupal\Core\Entity\EntityStorageInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorError;
use Drupal\dom_processor\Plugin\dom_processor\SemanticAnalyzerInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface;
use Drupal\paragraphs_editor\EditorFieldValue\ParagraphsEditorElementTrait;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * An analyzer plugin for extracting paragraphs editor data from a DOM tree.
 *
 * The paragraph analyzer will first look to see if there is an edit context for
 * a paragraph, and will try to load the paragraph from that context's edit
 * buffer if available.
 *
 * If no edits exist in the edit buffer for the context, the analyzer will
 * attempt to load the paragraph from the field items that the paragraph is
 * nested within.
 *
 * If the entity cannot be found in either of those locations, it is loaded from
 * through the entity storage system.
 *
 * @DomProcessorSemanticAnalyzer(
 *   id = "paragraphs_editor_paragraph_analyzer",
 *   label = "Paragraphs Editor Paragraph Analyzer"
 * )
 */
class ParagraphsEditorParagraphAnalyzer implements SemanticAnalyzerInterface, ContainerFactoryPluginInterface {
  use ParagraphsEditorElementTrait;

  /**
   * The paragraph storage handler.
   *
   * @var \Drupal\Core\Entity\EntityStorageInterface
   */
  protected $storage;

  /**
   * The context factory to get contexts for loading unsaved edits.
   *
   * @var \Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface
   */
  protected $contextFactory;

  /**
   * Creates a paragraph analyzer plugin.
   *
   * @param \Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface $field_value_manager
   *   The field value manager service to initialize the element trait.
   * @param \Drupal\Core\Entity\EntityStorageInterface $storage
   *   The paragraph storage handler for loading otherwise unresolvable
   *   entities.
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface $context_factory
   *   The context factory to use for looking up unsaved entity edits.
   */
  public function __construct(FieldValueManagerInterface $field_value_manager, EntityStorageInterface $storage, CommandContextFactoryInterface $context_factory) {
    $this->initializeParagraphsEditorElementTrait($field_value_manager);
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
    if ($data->is($this->getSelector('widget'))) {
      return $this->analyzeWidget($data);
    }
    elseif ($data->is($this->getSelector('field'))) {
      return $this->analyzeField($data);
    }
    else {
      return $data;
    }
  }

  /**
   * Analyzes a widget DOM element to produce semantic data.
   *
   * @param \Drupal\dom_processor\DomProcessor\SemanticDataInterface $data
   *   The current data state for the analyzer.
   *
   * @return \Drupal\dom_processor\DomProcessor\SemanticDataInterface
   *   The updated data state for the processor decorated with information about
   *   the referenced paragraph.
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
        }
        else {
          $context_id = NULL;
        }
      }
      catch (\Exception $e) {
      }
    }

    // If there is a field, try to load the entity revision from the field.
    if (!$entity && $data->has('field.items')) {
      foreach ($this->fieldValueManager->getReferencedEntities($data->get('field.items')) as $candidate) {
        if ($candidate->uuid() == $uuid) {
          $entity = $candidate;
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
   * Analyzes a field DOM element to produce semantic data.
   *
   * @param \Drupal\dom_processor\DomProcessor\SemanticDataInterface $data
   *   The current data state for the analyzer.
   *
   * @return \Drupal\dom_processor\DomProcessor\SemanticDataInterface
   *   The updated data state for the processor decorated with information about
   *   the referenced field.
   *
   *   bool:has paragraph entity
   *   bool:field exists on entity
   *   bool:is paragraphs field
   *   bool:is paragraphs editor field
   *
   *   in markup:
     *   string: name
     *   string: context id
     *   bool:field name exists
     *   bool: editable
     *
     * expected:
     *   items
     *   context_id
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

    if ($context_id && !$is_mutable) {
      $context_id = NULL;
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
