import { Planet, PlanetType } from "@darkforest_eth/types";
import { ethers } from "ethers";
import { getPlanetName } from "../lib/darkforest";
import { useContract, usePlayer, useSelectedPlanet, useCoreContract } from '.'

export function useColossus() {
  const { colossus } = useContract()
  const player = usePlayer()
  const selectedPlanet = useSelectedPlanet();

  const print = (msg: string) => {
    // @ts-expect-error
    df.terminal.current.println(msg);
  };

  const blocksLeftToProspectExpiration = (
    currentBlockNumber: number,
    prospectedBlockNumber: number
  ) => {
    return (prospectedBlockNumber || 0) + 255 - currentBlockNumber;
  };
  const prospectExpired = (
    currentBlockNumber: number,
    prospectedBlockNumber: number
  ) => {
    return (
      blocksLeftToProspectExpiration(
        currentBlockNumber,
        prospectedBlockNumber
      ) <= 0
    );
  };

  

  const checkDaoOwnership = async () => {
    if (!selectedPlanet) {
      print(`no planet selected to check`);
      return
    }
    // dao recognizes player as owner
    const pName = getPlanetName(selectedPlanet);
    const pBigNumber = ethers.BigNumber.from(`0x${selectedPlanet}`);
    // const updateTx = await colossus.updatePlanetOwners([pBigNumber]);
    // await updateTx.wait();
    // const result = colossus.interface.decodeFunctionData("updatePlanetOwners", updateTx.data);
    const owner = await colossus.planetOwners(pBigNumber);
    print(`dao says ${pName} is owned by ${owner}`);
    // console.log("tx result", result);
  };

  // TODO: import findMoveArgs type
  const processAndReturnPlanets = async (
    rips: Planet[],
    findArgsList: any[]
  ) => {
    const prevScore = (
      await colossus.contributions(player.address)
    ).toNumber();
    let currScore = prevScore;

    print(
      `received ${rips.length} rips and ${findArgsList.length} foundries for processing`
    );
    const locationIds = rips.map((p) =>
      ethers.BigNumber.from(`0x${p.locationId}`)
    );
    const gasLimit1Planet = 1000000;

    const gasLimit =
      gasLimit1Planet * (rips.length + 1) * (findArgsList.length + 1);

    let numReturned = 0;
    try {
      const processTx = await colossus.processAndReturnPlanets(
        locationIds,
        findArgsList,
        { gasLimit }
      );
      console.log(`processTx`, processTx);
      console.log(
        `gasLimit: ${processTx.gasLimit.toString()}, gasPrice: ${processTx?.gasPrice?.toString()}`
      );
      const processReceipt = await processTx.wait();
      print(`processed block number ${processReceipt.blockNumber}`);

      numReturned += rips.length + findArgsList.length;
      currScore = (await colossus.contributions(player.address)).toNumber();
    } catch (error) {
      console.log(`error processing and returning`, error);
    }
    const increase = currScore - prevScore;
    if (increase > 0) {
      print(
        `your score has increased ${increase} points for a total of ${currScore}!`
      );
    } else {
      print(`score has not increased :(`);
    }
    print(`processed and returned ${numReturned} planets to player`);
  };

  

  const returnSelected = async () => {
    // @ts-expect-error
    const planet = await df.getPlanetWithId(selectedPlanet);
    if (planet.planetType == PlanetType.RUINS) {
      await processAndReturnPlanets([planet], []);
    } else if (planet.planetType == PlanetType.TRADING_POST) {
      await processAndReturnPlanets([planet], []);
    }
    // await updatePlanetOwners([planet]);
  };


  const makeFindArtifactArgs = async (planets: Planet[]) => {
    let findArgsList = [];
    for (let p of planets) {
      //@ts-expect-error
      const findArgs = await df.snarkHelper.getFindArtifactArgs(
      //@ts-expect-error
        p.location.coords.x,
      //@ts-expect-error
        p.location.coords.y
      );
      console.log("findArgs", findArgs);
      findArgsList.push(findArgs);
    }

    return findArgsList;
  };

  const handleFind = async (p: Planet) => {
    // await transferPlanets([p]);
    // await handleFind(p);
    const findArgs = await makeFindArtifactArgs([p]);
    console.log(`findArgs`, findArgs);
    // process and return the planet
    await processAndReturnPlanets([], findArgs);
    // @ts-expect-error
    await df.hardRefreshPlanet(p.locationId);
  };

  /* only call this if you dao owns planet and is registered with dao and has been prospected */
  const readyToFind = async () => {
    // @ts-expect-error
    const planet = await df.getPlanetWithId(selectedPlanet);
    await handleFind(planet);
    // await updatePlanetOwners([planet]);
  };

  return {
    processAndReturnPlanets,
    returnSelected,
    checkDaoOwnership,
    readyToFind,
    handleFind
  }
}
