<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface;

class EditBufferItemMarkupCompilerSession {

  protected $contextFactory;
  protected $item;
  protected $paragraphContexts = [];
  protected $fieldMap = [];

  public function __construct(CommandContextFactoryInterface $context_factory, EditBufferItemInterface $item) {
    $this->contextFactory = $context_factory;
    $this->item = $item;
    $this->paragraphContexts = $item->getParagraphContexts();
  }

  public function getContext($field_config_id, $entity_id, $uuid) {
    // We regenerate the context each time the field item is rendered to
    // prevent issues with form caching. This means we have to map existing
    // edits fro mthe old context to the new one.
    if (!empty($this->paragraphContexts[$uuid][$field_config_id])) {
      $from_context = $this->contextFactory->get($this->paragraphContexts[$uuid][$field_config_id]);
      $context = $this->contextFactory->regenerate($from_context);
      $this->mapContext($from_context, $context);
      unset($this->paragraphContexts[$uuid][$field_config_id]);
    }
    else {
      $context = $this->contextFactory->create($field_config_id, $entity_id);
      $this->addContext($context->getContextString(), [
        'id' => $context->getContextString(),
        'ownerId' => $uuid,
        'fieldId' => $field_config_id,
        'schemaId' => $field_config_id,
      ]);
    }

    return $context;
  }

  public function cleanup() {
    foreach ($this->paragraphContexts as $residual_context_ids) {
      foreach ($residual_context_ids as $residual_context_id) {
        $residual_context = $this->contextFactory->get($residual_context_id);
        $this->contextFactory->free($residual_context);
      }
    }
  }

  public function mapContext($from_context, $to_context) {
    $this->contexts[$from_context->getContextString()]['id'] = $to_context->getContextString();
  }

  public function addContext($id, $data) {
    foreach ($data as $key => $val) {
      $this->contexts[$id][$key] = $val;
    }
  }

  public function getContexts() {
    return $this->contexts;
  }

  public function getFieldMap() {
    return $this->fieldMap;
  }

  public function mapPath(array $node_path) {
    $map = &$this->fieldMap;
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
  }
}
