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
  protected $entityCache = [];

  public function __construct($field_value_manager, array $elements, $entity_type_manager, $context_factory) {
    $this->initializeParagraphsEditorDomProcessorPlugin($field_value_manager, $elements);
    $this->storage = $entity_type_manager->getStorage('paragraph');
    $this->contextFactory = $context_factory;
    $this->loaded = FALSE;
  }

  /**
   * {@inheritdoc}
   */
  static public function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->get('paragraphs_editor.field_value.manager'),
      $container->getParameter('paragraphs_editor.field_value.elements'),
      $container->get('entity_type.manager'),
      $container->get('paragraphs_editor.command.context_factory')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function analyze(SemanticDataInterface $data) {
    if (!$this->loaded && $data->get('field.items')) {
      $this->loaded = TRUE;
      return $this->primeEntityCache($data, $data->get('field.items')->getEntity());
    }

    if ($data->is($this->getSelector('widget'))) {
      return $this->analyzeWidget($data);
    }
    else if ($data->is($this->getSelector('field'))) {
      return $this->analyzeField($data);
    }
    else {
      return $data;
    }
  }

  protected function analyzeWidget(SemanticDataInterface $data) {
    $entity = NULL;

    $uuid = $this->getAttribute($data, 'widget', '<uuid>');
    if (!$uuid) {
      throw new DomProcessorError("Reference to empty UUID discarded.");
    }

    $context_id = $this->getAttribute($data, 'widget', '<context>');
    if (!$context_id) {
      $context_id = $data->get('field.context_id');
    }

    if (!$context_id) {
      if (!empty($this->entityCache[$uuid])) {
        return $data->tag('paragraph', [
          'entity' => $this->entityCache[$uuid],
          'context_id' => $context_id,
          'has_edits' => $this->entityCache[$uuid]->isNew(),
        ]);
      }
    }
    else if (!empty($this->entityCache[$context_id . ':' . $uuid])) {
      return $data->tag('paragraph', [
        'entity' => $this->entityCache[$context_id . ':' . $uuid],
        'context_id' => $context_id,
        'has_edits' => TRUE,
      ]);
    }

    // If there is a context id provided, try to get the paragraph from the
    // context.
    $has_edits = FALSE;
    if ($context_id) {
      try {
        $context = $this->contextFactory->get($context_id);
        $edit_buffer = $context->getEditBuffer();
        $item = $edit_buffer->getItem($uuid);
        if ($item) {
          $entity = $item->getEntity();
          $this->entityCache[$context_id . ':' . $entity->uuid()] = $entity;
          $has_edits = TRUE;
        }
      }
      catch (\Exception $e) {
        throw new DomProcessorError("Could not load entity from context.");
      }
    }

    // If we are currently within a paragraph field try to get the entity from
    // the field.
    if (!$entity && $data->has('field.items')) {
      foreach ($data->get('field.items')->referencedEntities() as $entity_candidate) {
        if ($entity_candidate->uuid() == $uuid) {
          $entity = $entity_candidate;
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

    $this->entityCache[$entity->uuid()] = $entity;

    if (!$this->loaded) {
      $this->loaded = TRUE;
      $this->primeEntityCache($data, $entity, TRUE);
    }

    return $data->tag('paragraph', [
      'entity' => $entity,
      'context_id' => $context_id,
      'has_edits' => $entity->isNew() || $has_edits,
    ]);
  }

  protected function analyzeField(SemanticDataInterface $data) {
    $field_name = $this->getAttribute($data, 'field', '<name>');
    $is_mutable = filter_var($this->getAttribute($data, 'field', '<editable>'), FILTER_VALIDATE_BOOLEAN);
    $context_id = $this->getAttribute($data, 'field', '<context>');

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

  protected function primeEntityCache(SemanticDataInterface $data, $root_entity, $editor_only = FALSE) {
    $ids = [];
    $entity_items = [];
    foreach ($root_entity->getFields() as $items) {
      if ($this->fieldValueManager->isParagraphsField($items->getFieldDefinition())) {
        if (!$editor_only || $this->fieldValueManager->isParagraphsEditorField($items->getFieldDefinition())) {
          foreach ($items->referencedEntities() as $entity) {
            if ($entity->getRevisionId()) {
              $this->fieldValueManager->updateCache([$entity->getRevisionId() => $entity]);
              $data = $data->tag('cache', [
                'entity' => [
                  'revision:' . $entity->getRevisionId() => $entity,
                ],
              ], TRUE);
            }

            $this->entityCache[$entity->uuid()] = $entity;
            $data = $data->tag('cache', [
              'entity' => [
                $entity->uuid() => $entity,
              ],
            ], TRUE);
            $data = $this->primeEntityCache($data, $entity);
          }
        }
      }
    }

    return $data;
  }
}

