<?php

namespace Drupal\Tests\paragraphs_editor\Traits;

trait TestContentGenerationTrait {

  /*public function createMockViewBuilder($type) {
    $prophecy = $this->prophesize(ViewBuilderInterface::CLASS);
    $prophecy->view($type, Argument::any(), Argument::any())->will(function ($args) use ($type) {
      return [
        'tag' => $type . ':' . $args[1]->uuid(),
      ];
    });
    return $prophecy->reveal();
  }

  protected function createEntityStorage($type) {
    $prophecy_factory = $this;

    if ($type == 'node') {
      $prophecy = $this->prophesize(NodeStorage::CLASS);
    }
    else if ($type == 'field_config') {
      $prophecy = $this->prophesize(FieldConfigStorage::CLASS);
    }
    else if ($type == 'paragraph') {
      $prophecy = $this->prophesize(ParagraphStorage::CLASS);
    }
    else if ($type == 'paragraphs_type') {
      $prophecy = $this->prophesize(ParagraphsTypeStorage::CLASS);
    }

    $prophecy->create(Argument::any())->will(function ($args) {
    });
    $prophecy->load(Argument::any())->will(function ($args) {
    });
    $prophecy->loadRevision(Argument::any())->will(function ($args) {
    });
    $prophecy->loadByProperties(Argument::any())->will(function ($args) {
    });

    $cache[$type] = $prophecy->reveal();
  }

  protected function createFieldItems($entity, $field_definition) {
    if ($field_definition->getType() == 'entity_reference_revisions') {
      $prophecy = $this->prophesize();
    }
    else {
      $prophecy = $this->prophesize();
    }
    return $prophecy->reveal();
  }

  protected function createEntity($type, $attributes) {
    if ($type == 'node') {
      $prophecy = $this->prophesize(NodeInterface::CLASS);
    }
    else if ($type == 'field_config') {
      $prophecy = $this->prophesize(FieldConfigInterface::CLASS);
    }
    else if ($type == 'paragraph') {
      $prophecy = $this->prophesize(ParagraphInterface::CLASS);
    }
    else if ($type == 'paragraphs_type') {
      $prophecy = $this->prophesize(ParagraphsTypeInterface::CLASS);
    }

    $prophecy->getEntityTypeId()->willReturn($type);
    $prophecy->bundle()->willReturn($attributes['type']);
    $entity = $prophecy->reveal();

    if ($type == 'node' || $type == 'paragraph') {
      $field_definitions = $container->get('entity_type.manager.bundles.' . $type);
      if ($field_definitions) {
        foreach ($field_definitions as $field_definition) {
          $entity->{$field_definition->getName()} = $this->createFieldItems($entity, $field_definition);
        }
      }
    }

    return $entity;
  }

  protected function createAccessControlHandler() {
  }

  protected function getContainer() {
    if (isset($this->container)) {
      return $this->container;
    }

    $container = new Container();
    $prophecy = $this->prophesize(EntityTypeManagerInterface::CLASS);
    $prophecy->getStorage(Argument::type('string'))->will(function ($args) use ($container) {
      return $container->get('entity_type.manager.storage.' . $args[0]);
    });
    $prophecy->getAccessControlHandler(Argument::type('string'))->will(function ($args) use ($container) {
      return $container->get('entity_type.manager.access.' . $args[0]);
    });
    $prophecy->getViewBuilder(Argument::type('string'))->will(function ($args) use ($container) {
      return $container->get('entity_type.manager.view_builder.' . $args[0]);
    });
    $container->set('entity_type.manager', $prophecy->reveal());

    //$container->set('entity_type.manager.access.node', );
    //$container->set('entity_type.manager.access.paragraph', []);
    $container->set('entity_type.manager.storage.node', $this->createEntityStorage('node'));
    $container->set('entity_type.manager.storage.paragraph', $this->createEntityStorage('paragraph'));
    $container->set('entity_type.manager.storage.paragraphs_type', $this->createEntityStorage('paragraph_type'));
    $container->set('entity_type.manager.storage.field_config', $this->createEntityStorage('field_config'));
    $container->set('entity_type.manager.view_builder.paragraph', $this->createMockViewBuilder('paragraph'));

    // Set up the renderer mock.
    $prophecy = $this->prophesize(RendererInterface::CLASS);
    $prophecy->executeInRenderContext(Argument::cetera())->will(function ($args) {
      return $args[0]();
    });
    $prophecy->render(Argument::type('array'))->will(function ($args) {
      return $args[0]['tag'];
    });
    $container->set('renderer', $prophecy->reveal());
  }*/

  protected function generateTabs($storage, $tabs = 1) {

    $tab_paragraphs = [];
    for ($i = 0; $i < $tabs; $i++) {
      $tab_paragraph = $this->generateTab($storage, 'Tab ' . $i);
      $tab_paragraph->setNeedsSave(TRUE);
      $tab_paragraphs[] = [
        'entity' => $tab_paragraph,
        'target_id' => $tab_paragraph->id(),
        'target_revision_id' => $tab_paragraph->getRevisionId(),
      ];
    }

    $paragraph = $storage->create([
      'type' => 'tabs',
    ]);
    $paragraph->field_tabs->setValue($tab_paragraphs);
    return $paragraph;
  }

  protected function generateTab($storage, $title = 'Title') {
    $paragraph = $storage->create([
      'type' => 'tab',
    ]);
    $paragraph->field_title->value = $title;
    return $paragraph;
  }

  protected function generateEditorText($storage, $markup = 'test_markup', $format = 'default') {
    $paragraph = $storage->create([
      'type' => 'paragraphs_editor_text',
    ]);
    $paragraph->field_paragraphs_editor_text->setValue([
      'value' => $markup,
      'format' => $format,
    ]);
    return $paragraph;
  }

}
