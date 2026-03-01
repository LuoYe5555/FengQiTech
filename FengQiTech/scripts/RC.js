function onUse(event) {
  let player = event.getPlayer();
  let copyCount = 1;   

  let world = player.getWorld();
  let eyeLocation = player.getEyeLocation();
  let direction = eyeLocation.getDirection();
  let notplayer = eyeLocation.add(0, -0.7, 0).add(direction);
  let maxDistance = 100;
  let rayTraceResults = world.rayTrace(notplayer, direction, maxDistance,
      org.bukkit.FluidCollisionMode.ALWAYS, true, 0, null);

  // 如果没有击中任何实体，返回
  if (rayTraceResults === null) {
    player.sendMessage;
    return;
  }

  let entity = rayTraceResults.getHitEntity();

  if (entity instanceof org.bukkit.entity.Item) {
    let item = entity.getItemStack();
    
    // 检测是否为潜影盒
    let material = item.getType();
    if (material.name().includes("SHULKER_BOX")) {
      player.sendMessage("§c无法复制潜影盒！§e可恶的神人居然想刷物？");
      return;
    }
    // 检测是否为收纳袋(Bundle)
    if (material === org.bukkit.Material.BUNDLE) {
      player.sendMessage("§c无法复制收纳袋！§e可恶的神人，想都别想！");
      return;
    }

    // 检测粘液物品
    let sfItem = SlimefunItem.getByItem(item);
    if (sfItem !== null) {
      let itemId = sfItem.getId(); // 定义itemId变量
      
      // 检测是否为自身
      if (itemId === "FQ_RE_CHICKEN") {
        player.sendMessage("§c无法复制自身!§e可恶的神人，你想无限套娃？？");
        return;
      }

      // 检测是否为概念奇点
      if (itemId === "LOGITECH_STORAGE_SINGULARITY") {
        player.sendMessage("§c无法复制概念奇点!§e可恶的神人，这都被你想到了？？");
        return;
      }

      // 检测是否为高级量子存储
      if (itemId === "NTW_EXPANSION_ADVANCED_QUANTUM_STORAGE") {
        player.sendMessage("§c无法复制高级量子存储!§e可恶的神人，这都被你想到了？？");
        return;
      }

      // 检测是否为物品转移棒
      if (itemId === "NTW_EXPANSION_ITEM_MOVER") {
        player.sendMessage("§c无法复制物品转移棒!§e可恶的神人，物品转移棒都想到了？？");
        return;
      }

      // 检测是否为储存卡
      if (itemId === "_FINALTECH_STORAGE_CARD") {
        player.sendMessage("§c无法复制储存卡!§e可恶的神人，不许刷存储！");
        return;
      }

      // 检测是否为魔法存储终端
      if (itemId === "MAGIC_EXPANSION_CARGO_TERMINAL") {
        player.sendMessage("§c无法复制魔法存储终端!§e可恶的神人，连魔法2都想到了？？");
        return;
      }

      // 检测是否为以太秘匣
      if (itemId === "MAGIC_EXPANSION_CARGO_FRAGMENT") {
        player.sendMessage("§c无法复制以太秘匣!§e可恶的神人，以太秘匣都想到了？？");
        return;
      }

      // 检查是否为量子存储 (NTW_QUANTUM_STORAGE_0 到 NTW_QUANTUM_STORAGE_10)
      if (itemId.startsWith("NTW_QUANTUM_STORAGE_")) {
        // 提取数字部分
        let storageNumber = itemId.substring("NTW_QUANTUM_STORAGE_".length);
        // 检查是否是0到10的数字
        let num = parseInt(storageNumber);
        if (!isNaN(num) && num >= 0 && num <= 10) {
          player.sendMessage("§c无法复制量子存储！§e可恶的神人，想复制存储刷物？？");
          return;
        }
      }

      // 检查是否为 ME_ITEM_STORAGE_CELL_ 开头的存储单元
      if (itemId.startsWith("ME_ITEM_STORAGE_CELL_")) {
        player.sendMessage("§c无法复制ME存储元件!§e可恶的神人，AE2的存储也想刷？");
        return;
      }

    }
    
    let newAmount = item.clone();
    newAmount.setAmount(1);
    let location = entity.getLocation();
    
    // 复制物品
    for (let i = 0; i < copyCount; i++) {
      world.dropItemNaturally(location, newAmount);
    }

    
    
    player.sendMessage("§dSuccessfully copied!");
  } else {
    player.sendMessage("§cWhat was hit was not an item. Please right-click on the top of the dropped item or jump up and right-click on the dropped item");
  }
}