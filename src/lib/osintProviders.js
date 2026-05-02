const encode = (value) => encodeURIComponent(value || "");

const personQuery = (record) =>
  [record.owner_name, record.county, record.state].filter(Boolean).join(" ");

const cityState = (record) =>
  [record.county, record.state].filter(Boolean).join(", ");

export const getOsintLinks = (record) => {
  const query = personQuery(record);
  const name = record.owner_name || "";
  const location = cityState(record);

  return [
    {
      label: "BeenVerified",
      description: "Manual people-search lookup",
      url: `https://www.beenverified.com/app/person/search?name=${encode(name)}`,
    },
    {
      label: "TruePeopleSearch",
      description: "Manual name/location lookup",
      url: `https://www.truepeoplesearch.com/results?name=${encode(name)}&citystatezip=${encode(location)}`,
    },
    {
      label: "FastPeopleSearch",
      description: "Manual public-record lookup",
      url: `https://www.fastpeoplesearch.com/name/${encode(name.toLowerCase().replace(/\s+/g, "-"))}`,
    },
    {
      label: "Whitepages",
      description: "Manual people/address lookup",
      url: `https://www.whitepages.com/name/${encode(name)}`,
    },
    {
      label: "Spokeo",
      description: "Manual people-search lookup",
      url: `https://www.spokeo.com/${encode(name)}`,
    },
    {
      label: "Google",
      description: "Broad public web search",
      url: `https://www.google.com/search?q=${encode(`"${name}" ${record.county || ""} ${record.state || ""} surplus OR "excess funds"`)}`,
    },
    {
      label: "Bing",
      description: "Broad public web search",
      url: `https://www.bing.com/search?q=${encode(query)}`,
    },
    {
      label: "County Records",
      description: "Search county public records",
      url: `https://www.google.com/search?q=${encode(`${record.county || ""} ${record.state || ""} clerk public records "${name}"`)}`,
    },
  ];
};
