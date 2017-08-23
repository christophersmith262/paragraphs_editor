<?php

namespace Drupal\Tests\paragraphs_editor\Traits;

use Drupal\Component\Uuid;
use Drupal\Core\Field\FieldConfigInterface;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;
use Prophecy\Argument;

trait MockContextTrait {

  protected function mockParagraphDefaults() {
    return [
      'id' => rand(),
      'uuid' => (new Uuid\Php())->generate(),
      'bundle' => 'default',
    ];
  }

  protected function contextDefaults() {
    $prophecy = $this->prophesize(FieldConfigInterface::CLASS);
    $prophecy->id()->willReturn('default_field_id');
    return [
      'context_id' => md5(rand() . rand() . rand()),
      'bundle_filter' => [],
      'entity' => NULL,
      'field_definition' => $prophecy->reveal(),
      'edit_buffer' => [],
      'valid' => TRUE,
      'settings' => [],
    ];
  }

  protected function editBufferDefaults() {
    return [
      'uid' => 1,
    ];
  }

  protected function createContext(array $options = []) {
    $options += $this->contextDefaults();
    $options['edit_buffer']['context_id'] = $options['context_id'];

    $prophecy = $this->prophesize(CommandContextInterface::CLASS);
    $prophecy->getEntity()->willReturn($options['entity']);
    $prophecy->getFieldConfig()->willReturn($options['field_definition']);

    if (!empty($options['bundle_filter'])) {
      $prophecy->isValidBundle(Argument::any())->will(function ($args) use ($options) {
        return isset(array_flip($options)[$args[0]]);
      });
    }
    else {
      $prophecy->isValidBundle(Argument::any())->willReturn(TRUE);
    }

    $prophecy->getEditBuffer()->willReturn($this->createEditBuffer($options['edit_buffer']));
    $prophecy->getContextString()->willReturn($options['context_id']);

    $prophecy->getTemporary(Argument::any())->willReturn(NULL);
    $prophecy->setTemporary(Argument::cetera())->will(function ($args, $prophecy) {
      $prophecy->getTemporary($args[0])->willReturn($args[1]);
    });

    $prophecy->isValid()->willReturn($options['valid']);

    $prophecy->getPlugin(Argument::any())->willReturn(NULL);
    $prophecy->setPlugin(Argument::any())->will(function ($args, $prophecy) {
      $prophecy->getPlugin($args[0])->willReturn($args[1]);
    });

    $prophecy->getSettings()->willReturn($options['settings']);
    $prophecy->getSetting(Argument::any())->willReturn(NULL);
    foreach ($options['settings'] as $key => $val) {
      $prophecy->getSetting($key)->willReturn($val);
    }

    $prophecy->getAdditionalContext(Argument::any())->willReturn(NULL);
    $prophecy->addAdditionalContext(Argument::cetera())->will(function ($args, $prophecy) {
      $prophecy->getAdditionalContext($args[0])->willReturn($args[1]);
    });

    return $prophecy->reveal();
  }

  protected function createContextFactory(array $options = [], $return_prophecy = FALSE) {
    $prophecy_factory = $this;
    $prophecy = $this->prophesize(CommandContextFactoryInterface::CLASS);
    $prophecy->get(Argument::any())->will(function ($args) use ($options, $prophecy_factory) {
      if (!empty($options['contexts'][$args[0]])) {
        return $prophecy_factory->createContext($options['contexts'][$args[0]]);
      }
      else {
        return $prophecy_factory->createContext();
      }
    });
    return $return_prophecy ? $prophecy : $prophecy->reveal();
  }

  protected function createEditBuffer(array $options = []) {
    $options += $this->editBufferDefaults();
    $prophecy = $this->prophesize(EditBufferInterface::CLASS);
    $prophecy->getUser()->willReturn($options['uid']);
    $prophecy->getContextString()->willReturn($options['context_id']);

    $prophecy->getItem(Argument::any())->willReturn(NULL);

    $prophecy->setItem(Argument::any())->will(function ($args, $prophecy) {
      $prophecy->getItem($item->getEntity()->uuid())->willReturn($item->getEntity());
    });

    $prophecy_factory = $this;
    $prophecy->createItem(Argument::any())->will(function ($args, $prophecy) use($prophecy_factory) {
      $item_prophecy = $prophecy_factory->prophesize(EditBufferItemInterface::CLASS);
      $item_prophecy->getEntity()->willReturn($args[0]);
      $item_prophecy->overwrite(Argument::any())->will(function ($args, $item_prophecy) {
        $item_prophecy->getEntity()->willReturn($args[0]);
      });
      $item_prophecy->save()->willReturn(NULL);
      $item = $item_prophecy->reveal();

      $prophecy->getItem($args[0]->uuid())->willReturn($item);

      return $item;
    });

    $edit_buffer = $prophecy->reveal();

    if (!empty($options['default_items'])) {
      foreach ($options['default_items'] as $entity) {
        $edit_buffer->createItem($entity);
      }
    }

    return $edit_buffer;
  }

  protected function createMockParagraph(array $options = []) {
    $options += $this->mockParagraphDefaults();
    $prophecy = $this->prophesize(ParagraphInterface::CLASS);
    $prophecy->id()->willReturn($options['id']);
    $prophecy->uuid()->willReturn($options['uuid']);
    $prophecy->bundle()->willReturn($options['bundle']);
    return $prophecy->reveal();
  }
}
